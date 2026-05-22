from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from uuid import uuid4
import json
import re

from models.schemas import DocumentResult, Metric, VerificationCheck, VerificationSummary


TREASURY_REPORT_URL = "https://fiscal.treasury.gov/accounting/us-financial-report/2025-report"
TREASURY_DEBT_API_BASE = (
    "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny"
)
TREASURY_DEBT_DATASET_URL = "https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/debt-to-the-penny/"
CALIFORNIA_BUDGET_URL = "https://ebudget.ca.gov/budget/p/2025-26/BudgetSummary"


class VerificationService:
    def build_summary(self, result: DocumentResult) -> VerificationSummary:
        profile = self._classify_document(result)
        checks: List[VerificationCheck] = [self._build_source_check(profile)]

        if profile["kind"] == "federal_financial_report":
            debt_check = self._build_treasury_debt_check(result, profile)
            if debt_check:
                checks.insert(0, debt_check)

        verified = sum(1 for check in checks if check.status == "verified")
        mismatches = sum(1 for check in checks if check.status == "mismatch")
        document_only = sum(1 for check in checks if check.status == "document-only")

        headline = (
            f"{verified} verified, {mismatches} mismatch, and {document_only} document-only official check"
            f"{'' if len(checks) == 1 else 's'}."
        )

        return VerificationSummary(
            profile_label=profile["label"],
            headline=headline,
            checks=checks,
        )

    def _classify_document(self, result: DocumentResult) -> Dict[str, str]:
        document = result.document
        sample_text = " ".join(chunk.text for chunk in (result.extraction.chunks[:8] if result.extraction else []))
        haystack = f"{document.file_name} {document.file_type} {sample_text}".lower()

        if "treasury" in haystack or "u.s. government financial report" in haystack or "executive summary to the fy" in haystack:
            fiscal_year = self._detect_fiscal_year(haystack) or "2025"
            return {
                "kind": "federal_financial_report",
                "label": "U.S. Treasury financial report",
                "source_name": "U.S. Treasury Fiscal Data",
                "source_url": TREASURY_REPORT_URL,
                "fiscal_year": fiscal_year,
            }

        if "california" in haystack and "budget" in haystack:
            return {
                "kind": "state_budget",
                "label": "California public budget document",
                "source_name": "California E-Budget",
                "source_url": CALIFORNIA_BUDGET_URL,
                "fiscal_year": "2025",
            }

        return {
            "kind": "unknown",
            "label": "Unclassified financial document",
            "source_name": "Uploaded document",
            "source_url": "",
            "fiscal_year": "",
        }

    def _build_source_check(self, profile: Dict[str, str]) -> VerificationCheck:
        if profile["source_url"]:
            summary = (
                "SignalLens recognized this file as an official-source financial document and linked it to the "
                "public source used for manual confirmation and benchmark checks."
            )
        else:
            summary = (
                "SignalLens could not map this upload to a supported official public dataset yet, so only document-level "
                "evidence review is available."
            )

        return VerificationCheck(
            id=uuid4().hex,
            title="Official source traceability",
            status="document-only",
            source_name=profile["source_name"],
            source_url=profile["source_url"] or None,
            summary=summary,
            metadata={"profile_kind": profile["kind"]},
        )

    def _build_treasury_debt_check(
        self,
        result: DocumentResult,
        profile: Dict[str, str],
    ) -> Optional[VerificationCheck]:
        fiscal_year = profile["fiscal_year"]
        debt_record = self._fetch_treasury_debt_record(fiscal_year)
        if not debt_record:
            return None

        metric, dataset_key, dataset_label = self._find_treasury_debt_metric(result)
        official_value = float(debt_record[dataset_key])
        official_value_label = self._format_currency(official_value)
        record_date = debt_record["record_date"]

        if not metric:
            return VerificationCheck(
                id=uuid4().hex,
                title="Treasury debt benchmark",
                status="document-only",
                source_name="Treasury Fiscal Data · Debt to the Penny",
                source_url=TREASURY_DEBT_DATASET_URL,
                summary=(
                    f"Loaded the official FY {fiscal_year} Treasury debt record for context, but the current extraction "
                    f"did not expose a clean debt metric label that could be matched automatically."
                ),
                official_value_label=f"{dataset_label}: {official_value_label} ({record_date})",
                metadata={"fiscal_year": fiscal_year, "record_date": record_date},
            )

        document_value = self._normalized_metric_value(metric)
        relative_diff = abs(document_value - official_value) / max(abs(official_value), 1.0)
        status = "verified" if relative_diff <= 0.05 else "mismatch"
        summary = (
            f"Matched the extracted `{metric.name}` figure against Treasury's official FY {fiscal_year} debt record "
            f"dated {record_date}."
        )

        evidence_ids = list(dict.fromkeys(metric.evidence_ids))[:3]
        return VerificationCheck(
            id=uuid4().hex,
            title=f"{dataset_label} check",
            status=status,
            source_name="Treasury Fiscal Data · Debt to the Penny",
            source_url=TREASURY_DEBT_DATASET_URL,
            summary=summary,
            document_value_label=self._format_currency(document_value),
            official_value_label=official_value_label,
            evidence_ids=evidence_ids,
            metadata={
                "fiscal_year": fiscal_year,
                "record_date": record_date,
                "metric_name": metric.name,
                "relative_diff": round(relative_diff, 4),
            },
        )

    def _find_treasury_debt_metric(
        self,
        result: DocumentResult,
    ) -> Tuple[Optional[Metric], str, str]:
        extraction = result.extraction
        if not extraction:
            return None, "tot_pub_debt_out_amt", "Total public debt outstanding"

        debt_candidates: List[Tuple[Metric, str, str, int]] = []
        for metric in extraction.metrics:
            label = metric.name.lower()
            if metric.unit != "$":
                continue

            if "debt subject to the statutory limit was" in label:
                debt_candidates.append((metric, "tot_pub_debt_out_amt", "Total public debt outstanding", 5))
            elif "debt held by the public" in label:
                debt_candidates.append((metric, "debt_held_public_amt", "Debt held by the public", 4))
            elif "public debt" in label or "debt subject to the statutory limit" in label or "debt limit" in label:
                debt_candidates.append((metric, "tot_pub_debt_out_amt", "Total public debt outstanding", 3))
            elif "federal debt" in label:
                debt_candidates.append((metric, "tot_pub_debt_out_amt", "Total public debt outstanding", 2))
            elif "liabilit" in label and metric.value > 1000000000000:
                debt_candidates.append((metric, "tot_pub_debt_out_amt", "Total public debt outstanding", 1))

        if not debt_candidates:
            return None, "tot_pub_debt_out_amt", "Total public debt outstanding"

        metric, dataset_key, dataset_label, _ = sorted(
            debt_candidates,
            key=lambda item: (item[3], item[0].value),
            reverse=True,
        )[0]
        return metric, dataset_key, dataset_label

    def _detect_fiscal_year(self, haystack: str) -> Optional[str]:
        match = re.search(r"\bfy\s*([0-9]{4})\b", haystack)
        if match:
            return match.group(1)

        match = re.search(r"\b(20[0-9]{2})\b", haystack)
        if match:
            return match.group(1)
        return None

    @lru_cache(maxsize=8)
    def _fetch_treasury_debt_record(self, fiscal_year: str) -> Optional[Dict[str, Any]]:
        query = urlencode(
            {
                "filter": f"record_fiscal_year:in:({fiscal_year})",
                "sort": "-record_date",
                "page[size]": "1",
            }
        )
        url = f"{TREASURY_DEBT_API_BASE}?{query}"
        request = Request(
            url,
            headers={
                "User-Agent": "SignalLens/0.1 (hackathon demo verification)",
                "Accept": "application/json",
            },
        )

        try:
            with urlopen(request, timeout=15) as response:
                payload = json.load(response)
        except Exception:
            return None

        data = payload.get("data") or []
        if not data:
            return None
        return data[0]

    def _format_currency(self, value: float) -> str:
        absolute = abs(value)
        sign = "-" if value < 0 else ""
        if absolute >= 1000000000000:
            return f"{sign}${absolute / 1000000000000.0:.2f}T"
        if absolute >= 1000000000:
            return f"{sign}${absolute / 1000000000.0:.2f}B"
        if absolute >= 1000000:
            return f"{sign}${absolute / 1000000.0:.2f}M"
        return f"{sign}${absolute:,.0f}"

    def _normalized_metric_value(self, metric: Metric) -> float:
        text = metric.raw_text.lower()
        if metric.unit != "$":
            return metric.value

        if "trillion" in text and abs(metric.value) < 1000:
            return metric.value * 1000000000000.0
        if "billion" in text and abs(metric.value) < 1000000:
            return metric.value * 1000000000.0
        if "million" in text and abs(metric.value) < 1000:
            return metric.value * 1000000.0
        return metric.value


verification_service = VerificationService()
