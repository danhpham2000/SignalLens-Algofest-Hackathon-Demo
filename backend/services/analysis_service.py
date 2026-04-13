from collections import defaultdict
from typing import Dict, List, Optional, Tuple
import re
from uuid import uuid4

from core.config import get_settings
from core.constants import (
    DEFAULT_SCORING_FORMULA,
    HIGH_VALUE_RISK_THRESHOLDS,
    HIGHER_IS_BETTER_HINTS,
    LOW_VALUE_RISK_THRESHOLDS,
    LOWER_IS_BETTER_HINTS,
    RISK_KEYWORD_WEIGHTS,
)
from db.neo4j_repo import neo4j_repository
from models.schemas import AnalysisResult, Chunk, DocumentResult, ExtractionResult, Finding, Metric, ScoreBreakdown
from services.explanation_service import explanation_service
from services.extraction_service import extraction_service
from services.storage_service import storage_service


class AnalysisService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def run_extraction(self, document_id: str) -> ExtractionResult:
        existing = storage_service.get_extraction(document_id)
        if existing:
            return existing

        document = storage_service.get_document(document_id)
        extraction = extraction_service.extract_document(document)
        document.warnings = extraction.metadata.get("warnings", [])
        storage_service.update_document(document)
        return storage_service.save_extraction(extraction)

    def run_analysis(self, document_id: str) -> AnalysisResult:
        existing = storage_service.get_analysis(document_id)
        if existing and existing.findings:
            return existing

        extraction = self.run_extraction(document_id)
        findings = self._score_findings(document_id, extraction)
        analysis = AnalysisResult(
            document_id=document_id,
            findings=findings[: self.settings.max_findings],
            scoring_formula=DEFAULT_SCORING_FORMULA,
            metadata={
                "chunk_count": extraction.chunk_count,
                "metric_count": extraction.metric_count,
                "warnings": extraction.metadata.get("warnings", []),
            },
        )
        return storage_service.save_analysis(analysis)

    def run_explanation(self, document_id: str) -> DocumentResult:
        document = storage_service.get_document(document_id)
        extraction = self.run_extraction(document_id)
        analysis = self.run_analysis(document_id)

        summary = storage_service.get_summary(document_id)
        if summary and all(finding.explanation for finding in analysis.findings):
            return storage_service.build_result(document_id)

        analysis, summary = explanation_service.explain(document, extraction, analysis)
        storage_service.save_analysis(analysis)
        storage_service.save_summary(summary)
        result = storage_service.build_result(document_id)
        if neo4j_repository.enabled():
            neo4j_repository.sync_document_result(result)
        return result

    def get_result(self, document_id: str, ensure_complete: bool = True) -> DocumentResult:
        if ensure_complete:
            return self.run_explanation(document_id)
        return storage_service.build_result(document_id)

    def _score_findings(self, document_id: str, extraction: ExtractionResult) -> List[Finding]:
        chunk_lookup = {chunk.id: chunk for chunk in extraction.chunks}
        grouped_metrics: Dict[str, List[Metric]] = defaultdict(list)

        for metric in extraction.metrics:
            group_key = metric.metadata.get("series_key") or metric.name.lower()
            grouped_metrics[group_key].append(metric)

        findings: List[Finding] = []
        for metrics in grouped_metrics.values():
            metrics = sorted(metrics, key=self._metric_sort_key)
            finding = self._build_metric_finding(document_id, metrics, chunk_lookup)
            if finding and finding.final_score >= 1.0:
                findings.append(finding)

        if len(findings) < 3:
            findings.extend(
                self._build_text_findings(
                    document_id=document_id,
                    chunks=extraction.chunks,
                    existing_titles={finding.title for finding in findings},
                )
            )

        findings.sort(key=lambda item: item.final_score, reverse=True)
        return findings

    def _build_metric_finding(
        self,
        document_id: str,
        metrics: List[Metric],
        chunk_lookup: Dict[str, Chunk],
    ) -> Optional[Finding]:
        if not metrics:
            return None

        current = metrics[-1]
        previous = metrics[-2] if len(metrics) > 1 else None
        evidence_ids = self._collect_evidence_ids(metrics)
        evidence_chunks = [chunk_lookup[evidence_id] for evidence_id in evidence_ids if evidence_id in chunk_lookup]
        evidence_text = " ".join(chunk.text for chunk in evidence_chunks).lower()

        change_score, change_percent, change_direction = self._score_change(current, previous)
        severity_component = self._score_severity(current, previous, change_direction)
        keyword_score = self._score_keywords(evidence_text)
        evidence_score = self._score_evidence(evidence_chunks)
        uncertainty_penalty = self._score_uncertainty(current, evidence_chunks)

        final_score = round(
            max(0.0, change_score + severity_component + evidence_score + keyword_score - uncertainty_penalty),
            2,
        )
        user_severity = round(min(10.0, final_score), 2)
        confidence = round(
            max(0.2, min(0.98, 0.45 + (evidence_score * 0.12) + (1.5 - min(1.5, uncertainty_penalty)) * 0.12)),
            2,
        )

        title = self._build_title(current, previous, change_percent, change_direction)
        return Finding(
            id=uuid4().hex,
            document_id=document_id,
            title=title,
            severity_score=user_severity,
            confidence_score=confidence,
            final_score=final_score,
            evidence_ids=evidence_ids,
            metric_ids=[metric.id for metric in metrics],
            score_breakdown=ScoreBreakdown(
                change_score=round(change_score, 2),
                severity_score=round(severity_component, 2),
                evidence_score=round(evidence_score, 2),
                keyword_score=round(keyword_score, 2),
                uncertainty_penalty=round(uncertainty_penalty, 2),
                final_score=final_score,
            ),
            uncertainty_label=self._uncertainty_label(confidence),
            metadata={
                "metric_names": [current.name],
                "current_value": current.value,
                "current_unit": current.unit,
                "previous_value": previous.value if previous else None,
                "change_percent": round(change_percent, 2) if change_percent is not None else None,
                "change_direction": change_direction,
                "period": current.period,
            },
        )

    def _build_text_findings(
        self,
        document_id: str,
        chunks: List[Chunk],
        existing_titles: set,
    ) -> List[Finding]:
        findings: List[Finding] = []
        for chunk in chunks:
            if len(findings) + len(existing_titles) >= self.settings.max_findings:
                break

            keyword_score = self._score_keywords(chunk.text.lower())
            if keyword_score < 1.8:
                continue

            title = "Risk language detected on page {page}".format(page=chunk.page_number)
            if title in existing_titles:
                continue

            evidence_score = self._score_evidence([chunk])
            uncertainty_penalty = self._score_uncertainty_from_chunk(chunk)
            final_score = round(max(0.0, keyword_score + evidence_score - uncertainty_penalty), 2)
            if final_score < 1.5:
                continue

            findings.append(
                Finding(
                    id=uuid4().hex,
                    document_id=document_id,
                    title=title,
                    severity_score=round(min(10.0, final_score), 2),
                    confidence_score=round(max(0.25, min(0.85, 0.5 + evidence_score * 0.1 - uncertainty_penalty * 0.1)), 2),
                    final_score=final_score,
                    evidence_ids=[chunk.id],
                    metric_ids=[],
                    score_breakdown=ScoreBreakdown(
                        change_score=0.0,
                        severity_score=0.0,
                        evidence_score=round(evidence_score, 2),
                        keyword_score=round(keyword_score, 2),
                        uncertainty_penalty=round(uncertainty_penalty, 2),
                        final_score=final_score,
                    ),
                    uncertainty_label=self._uncertainty_label(0.5),
                    metadata={"metric_names": ["narrative risk signal"]},
                )
            )
            existing_titles.add(title)

        return findings

    def _score_change(
        self,
        current: Metric,
        previous: Optional[Metric],
    ) -> Tuple[float, Optional[float], str]:
        if previous is None:
            if current.unit == "%":
                return min(abs(current.value) / 8.0, 3.5), current.value, self._direction_from_value(current.value)
            return min(abs(current.value) / 1000000.0, 2.0), None, "flat"

        delta = current.value - previous.value
        if abs(previous.value) > 0.0001:
            change_percent = (delta / abs(previous.value)) * 100.0
            score = min(abs(change_percent) / 18.0, 4.5)
        else:
            change_percent = None
            score = min(abs(delta) / 1000000.0, 3.0)
        return score, change_percent, self._direction_from_value(delta)

    def _score_severity(
        self,
        current: Metric,
        previous: Optional[Metric],
        change_direction: str,
    ) -> float:
        name = current.name.lower()
        severity = 0.0

        for hint, threshold in HIGH_VALUE_RISK_THRESHOLDS.items():
            if hint in name and current.value >= threshold:
                severity += min(current.value / threshold, 4.0)

        for hint, threshold in LOW_VALUE_RISK_THRESHOLDS.items():
            if hint in name and current.value <= threshold:
                if threshold:
                    severity += min(((threshold - current.value) / threshold) * 4.0 + 0.5, 4.5)

        if current.unit == "%" and current.value < 0 and self._trend_preference(name) == "higher":
            severity += min(abs(current.value) / 10.0, 3.0)

        if current.value < 0 and self._trend_preference(name) == "higher":
            severity += 2.2

        if previous and change_direction != "flat":
            preferred_direction = self._trend_preference(name)
            if preferred_direction == "higher" and change_direction == "down":
                severity += 1.4
            elif preferred_direction == "lower" and change_direction == "up":
                severity += 1.4
            elif preferred_direction == "neutral":
                severity += 0.7

        return min(severity, 4.8)

    def _score_keywords(self, evidence_text: str) -> float:
        score = 0.0
        for keyword, weight in RISK_KEYWORD_WEIGHTS.items():
            if keyword in evidence_text:
                score += weight
        return min(score, 3.2)

    def _score_evidence(self, evidence_chunks: List[Chunk]) -> float:
        if not evidence_chunks:
            return 0.5

        chunk_types = {chunk.chunk_type for chunk in evidence_chunks}
        score = 0.8
        if "table" in chunk_types:
            score += 1.0
        if "text" in chunk_types:
            score += 0.6
        if "ocr" in chunk_types or "image" in chunk_types:
            score += 0.3
        if len(evidence_chunks) > 1:
            score += 0.4
        return min(score, 2.5)

    def _score_uncertainty(self, metric: Metric, evidence_chunks: List[Chunk]) -> float:
        penalty = 0.0
        if len(metric.name.split()) <= 1:
            penalty += 0.4
        if all(chunk.chunk_type in {"ocr", "image"} for chunk in evidence_chunks) and evidence_chunks:
            penalty += 0.9
        if any(len(chunk.text) < 30 for chunk in evidence_chunks):
            penalty += 0.3
        return min(penalty, 2.0)

    def _score_uncertainty_from_chunk(self, chunk: Chunk) -> float:
        penalty = 0.2
        if chunk.chunk_type in {"ocr", "image"}:
            penalty += 0.8
        if len(chunk.text) < 80:
            penalty += 0.3
        return min(penalty, 1.5)

    def _collect_evidence_ids(self, metrics: List[Metric]) -> List[str]:
        evidence_ids: List[str] = []
        for metric in metrics:
            for evidence_id in metric.evidence_ids:
                if evidence_id not in evidence_ids:
                    evidence_ids.append(evidence_id)
        return evidence_ids[:3]

    def _build_title(
        self,
        current: Metric,
        previous: Optional[Metric],
        change_percent: Optional[float],
        change_direction: str,
    ) -> str:
        if previous is not None and change_percent is not None and abs(change_percent) >= 8:
            verb = "rose" if change_direction == "up" else "fell"
            if self._trend_preference(current.name.lower()) == "lower" and change_direction == "up":
                verb = "spiked"
            return "{name} {verb} {change:.1f}%".format(
                name=current.name,
                verb=verb,
                change=abs(change_percent),
            )

        return "{name} at {value}".format(name=current.name, value=self._format_value(current.value, current.unit))

    def _direction_from_value(self, value: float) -> str:
        if value > 0:
            return "up"
        if value < 0:
            return "down"
        return "flat"

    def _metric_sort_key(self, metric: Metric):
        period_rank = self._period_rank(metric.period)
        if period_rank is None:
            return (0, int(metric.metadata.get("sequence_index", 0)))
        return (1, period_rank)

    def _period_rank(self, period: Optional[str]) -> Optional[float]:
        if not period:
            return None

        normalized = period.strip().lower()
        if normalized == "previous":
            return 0.0
        if normalized == "current":
            return 1.0

        quarter_match = re.match(r"q([1-4])\s+(\d{4})", normalized)
        if quarter_match:
            quarter = int(quarter_match.group(1))
            year = int(quarter_match.group(2))
            return float(year * 10 + quarter)

        half_match = re.match(r"h([1-2])\s+(\d{4})", normalized)
        if half_match:
            half = int(half_match.group(1))
            year = int(half_match.group(2))
            return float(year * 10 + half * 5)

        year_match = re.match(r"(\d{4})", normalized)
        if year_match:
            return float(int(year_match.group(1)) * 10)

        point_match = re.match(r"point_(\d+)", normalized)
        if point_match:
            return float(int(point_match.group(1)))

        return None

    def _trend_preference(self, metric_name: str) -> str:
        if any(hint in metric_name for hint in HIGHER_IS_BETTER_HINTS):
            return "higher"
        if any(hint in metric_name for hint in LOWER_IS_BETTER_HINTS):
            return "lower"
        return "neutral"

    def _format_value(self, value: float, unit: Optional[str]) -> str:
        absolute = abs(value)
        sign = "-" if value < 0 else ""

        if unit == "%":
            return "{sign}{value:.1f}%".format(sign=sign, value=absolute)
        if unit == "$":
            if absolute >= 1000000000:
                return "{sign}${value:.2f}B".format(sign=sign, value=absolute / 1000000000.0)
            if absolute >= 1000000:
                return "{sign}${value:.2f}M".format(sign=sign, value=absolute / 1000000.0)
            if absolute >= 1000:
                return "{sign}${value:.1f}K".format(sign=sign, value=absolute / 1000.0)
            return "{sign}${value:,.0f}".format(sign=sign, value=absolute)
        if absolute >= 1000000:
            return "{sign}{value:.2f}M".format(sign=sign, value=absolute / 1000000.0)
        if absolute >= 1000:
            return "{sign}{value:,.0f}".format(sign=sign, value=absolute)
        if unit:
            return "{sign}{value:.2f}{unit}".format(sign=sign, value=absolute, unit=unit)
        return "{sign}{value:.2f}".format(sign=sign, value=absolute)

    def _uncertainty_label(self, confidence: float) -> str:
        if confidence >= 0.8:
            return "low"
        if confidence >= 0.55:
            return "medium"
        return "high"


analysis_service = AnalysisService()
