from typing import Dict, List, Optional, Tuple
from uuid import uuid4
import re

from core.constants import HIGHER_IS_BETTER_HINTS, LOWER_IS_BETTER_HINTS
from models.schemas import ComparisonChange, ComparisonSummary, DocumentResult, Metric


FINANCIAL_LABEL_HINTS = {
    "asset",
    "budget",
    "burn",
    "capital",
    "cash",
    "cost",
    "debt",
    "deficit",
    "delinquency",
    "deposit",
    "equity",
    "expense",
    "fund",
    "gdp",
    "income",
    "interest",
    "liabil",
    "loss",
    "margin",
    "net",
    "operating",
    "outlay",
    "profit",
    "receipt",
    "reserve",
    "revenue",
    "sales",
    "spending",
    "tax",
}


class CompareService:
    def build_summary(self, result: DocumentResult) -> ComparisonSummary:
        extraction = result.extraction
        if not extraction or not extraction.metrics:
            return ComparisonSummary(
                mode="none",
                headline="No structured comparison is available yet.",
                summary="SignalLens needs at least one comparable metric pair to build a period-over-period view.",
                baseline_label=None,
                changes=[],
            )

        grouped_metrics: Dict[str, List[Metric]] = {}
        for metric in extraction.metrics:
            group_key = metric.metadata.get("series_key") or self._series_key(metric.name)
            grouped_metrics.setdefault(str(group_key), []).append(metric)

        changes: List[ComparisonChange] = []
        for metrics in grouped_metrics.values():
            pair = self._select_metric_pair(metrics)
            if not pair:
                continue

            previous, current = pair
            if self._should_skip_pair(previous, current):
                continue

            changes.append(self._build_change(previous, current))

        changes.sort(
            key=lambda item: (
                self._status_rank(item.status),
                self._unit_rank(item.unit),
                1 if self._is_financial_label(item.label.lower()) else 0,
                abs(item.change_percent or 0.0),
                abs(item.current_value - (item.previous_value or 0.0)),
            ),
            reverse=True,
        )
        changes = changes[:6]

        if not changes:
            return ComparisonSummary(
                mode="none",
                headline="No reliable period comparison was detected.",
                summary=(
                    "The current extraction did not expose a clean current-versus-prior metric pair "
                    "that SignalLens could compare with enough confidence."
                ),
                baseline_label=None,
                changes=[],
            )

        worsening = sum(1 for change in changes if change.status == "worsening")
        improving = sum(1 for change in changes if change.status == "improving")
        stable = sum(1 for change in changes if change.status == "stable")

        headline = (
            f"Period comparison found {worsening} worsening, {improving} improving, "
            f"and {stable} stable signal{'s' if len(changes) != 1 else ''}."
        )
        summary = (
            "SignalLens paired current and prior values from the same document, then ranked the clearest "
            "period-over-period movements for fast review."
        )

        return ComparisonSummary(
            mode="document_periods",
            headline=headline,
            summary=summary,
            baseline_label="Current vs previous period",
            changes=changes,
        )

    def _select_metric_pair(self, metrics: List[Metric]) -> Optional[Tuple[Metric, Metric]]:
        current_metrics = [metric for metric in metrics if (metric.period or "").strip().lower() == "current"]
        previous_metrics = [metric for metric in metrics if (metric.period or "").strip().lower() == "previous"]
        if current_metrics and previous_metrics:
            candidates: List[Tuple[int, int, Metric, Metric]] = []
            for current_metric in current_metrics:
                for previous_metric in previous_metrics:
                    if self._looks_like_year(previous_metric.value, previous_metric.unit):
                        continue
                    if self._looks_like_year(current_metric.value, current_metric.unit):
                        continue
                    unit_match = 1 if current_metric.unit == previous_metric.unit else 0
                    sequence_distance = abs(
                        int(current_metric.metadata.get("sequence_index", 0))
                        - int(previous_metric.metadata.get("sequence_index", 0))
                    )
                    candidates.append((unit_match, -sequence_distance, previous_metric, current_metric))

            unit_matched_candidates = [candidate for candidate in candidates if candidate[0] == 1]
            if unit_matched_candidates:
                _, _, previous_metric, current_metric = sorted(
                    unit_matched_candidates,
                    key=lambda item: (item[0], item[1]),
                    reverse=True,
                )[0]
                return previous_metric, current_metric

        ranked_metrics = sorted(metrics, key=self._metric_sort_key)
        comparable = [
            metric
            for metric in ranked_metrics
            if self._period_rank(metric.period) is not None and not str(metric.period).startswith("point_")
        ]
        if len(comparable) >= 2:
            previous_metric = comparable[-2]
            current_metric = comparable[-1]
            if previous_metric.unit == current_metric.unit:
                return previous_metric, current_metric
        return None

    def _should_skip_pair(self, previous: Metric, current: Metric) -> bool:
        label = current.name.lower()
        if not self._is_financial_label(label) and (current.unit or previous.unit) not in {"$", "%", "bps", "x"}:
            return True

        if self._looks_like_year(previous.value, previous.unit) or self._looks_like_year(current.value, current.unit):
            return True

        if previous.unit and current.unit and previous.unit != current.unit:
            return True

        if abs(previous.value) < 0.0001 and abs(current.value) < 0.0001:
            return True

        if (previous.unit == "$" or current.unit == "$") and min(abs(previous.value), abs(current.value)) > 0:
            ratio = max(abs(previous.value), abs(current.value)) / min(abs(previous.value), abs(current.value))
            if ratio > 500:
                return True

        return False

    def _build_change(self, previous: Metric, current: Metric) -> ComparisonChange:
        delta = current.value - previous.value
        direction = self._direction_from_value(delta)
        change_percent = None
        change_percent_label = None
        if abs(previous.value) > 0.0001:
            change_percent = (delta / abs(previous.value)) * 100.0
            sign = "+" if change_percent > 0 else ""
            change_percent_label = f"{sign}{change_percent:.1f}%"

        status = self._comparison_status(current.name.lower(), delta, change_percent)
        evidence_ids = list(dict.fromkeys(previous.evidence_ids + current.evidence_ids))[:3]

        return ComparisonChange(
            id=uuid4().hex,
            label=current.name,
            status=status,
            direction=direction,
            current_value=current.value,
            current_value_label=self._format_value(current.value, current.unit),
            previous_value=previous.value,
            previous_value_label=self._format_value(previous.value, previous.unit),
            unit=current.unit or previous.unit,
            period_current=current.period,
            period_previous=previous.period,
            change_percent=round(change_percent, 2) if change_percent is not None else None,
            change_percent_label=change_percent_label,
            evidence_ids=evidence_ids,
            metadata={"series_key": current.metadata.get("series_key") or self._series_key(current.name)},
        )

    def _comparison_status(self, label: str, delta: float, change_percent: Optional[float]) -> str:
        if change_percent is not None and abs(change_percent) < 1.0:
            return "stable"
        if change_percent is None and abs(delta) < 0.0001:
            return "stable"

        preference = self._trend_preference(label)
        if preference == "higher":
            return "improving" if delta > 0 else "worsening"
        if preference == "lower":
            return "improving" if delta < 0 else "worsening"
        return "stable" if abs(change_percent or 0.0) < 5.0 else "worsening"

    def _trend_preference(self, metric_name: str) -> str:
        if any(hint in metric_name for hint in HIGHER_IS_BETTER_HINTS):
            return "higher"
        if any(hint in metric_name for hint in LOWER_IS_BETTER_HINTS):
            return "lower"
        return "neutral"

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
            return float(int(quarter_match.group(2)) * 10 + int(quarter_match.group(1)))

        half_match = re.match(r"h([1-2])\s+(\d{4})", normalized)
        if half_match:
            return float(int(half_match.group(2)) * 10 + int(half_match.group(1)) * 5)

        year_match = re.match(r"(\d{4})", normalized)
        if year_match:
            return float(int(year_match.group(1)) * 10)

        point_match = re.match(r"point_(\d+)", normalized)
        if point_match:
            return float(int(point_match.group(1)))

        return None

    def _direction_from_value(self, value: float) -> str:
        if value > 0:
            return "up"
        if value < 0:
            return "down"
        return "flat"

    def _looks_like_year(self, value: float, unit: Optional[str]) -> bool:
        return unit is None and 1900 <= value <= 2100 and float(value).is_integer()

    def _is_financial_label(self, label: str) -> bool:
        return any(hint in label for hint in FINANCIAL_LABEL_HINTS)

    def _series_key(self, label: str) -> str:
        return re.sub(r"[^a-z0-9]+", "_", label.lower()).strip("_")

    def _status_rank(self, status: str) -> int:
        ranks = {"worsening": 3, "improving": 2, "stable": 1}
        return ranks.get(status, 0)

    def _unit_rank(self, unit: Optional[str]) -> int:
        if unit == "$":
            return 3
        if unit in {"%", "bps", "x"}:
            return 2
        if unit:
            return 1
        return 0

    def _format_value(self, value: float, unit: Optional[str]) -> str:
        absolute = abs(value)
        sign = "-" if value < 0 else ""

        if unit == "%":
            return f"{sign}{absolute:.1f}%"
        if unit == "$":
            if absolute >= 1000000000:
                return f"{sign}${absolute / 1000000000.0:.2f}B"
            if absolute >= 1000000:
                return f"{sign}${absolute / 1000000.0:.2f}M"
            if absolute >= 1000:
                return f"{sign}${absolute / 1000.0:.1f}K"
            return f"{sign}${absolute:,.0f}"
        if absolute >= 1000000000:
            return f"{sign}{absolute / 1000000000.0:.2f}B"
        if absolute >= 1000000:
            return f"{sign}{absolute / 1000000.0:.2f}M"
        if absolute >= 1000:
            return f"{sign}{absolute:,.0f}"
        return f"{sign}{absolute:.2f}{unit or ''}"


compare_service = CompareService()
