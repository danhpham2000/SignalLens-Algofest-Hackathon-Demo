ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "webp"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
}

TEXT_CHUNK_TYPE = "text"
TABLE_CHUNK_TYPE = "table"
OCR_CHUNK_TYPE = "ocr"
IMAGE_CHUNK_TYPE = "image"

RISK_KEYWORD_WEIGHTS = {
    "decline": 1.6,
    "drop": 1.5,
    "fell": 1.5,
    "down": 1.2,
    "loss": 1.8,
    "burn": 1.7,
    "debt": 1.4,
    "churn": 1.8,
    "litigation": 2.0,
    "downgrade": 1.8,
    "shortfall": 1.7,
    "delinquency": 1.8,
    "default": 2.2,
    "risk": 1.1,
    "uncertain": 1.0,
    "warning": 1.6,
}

HIGHER_IS_BETTER_HINTS = {
    "revenue",
    "sales",
    "bookings",
    "arr",
    "mrr",
    "margin",
    "cash",
    "ebitda",
    "profit",
    "customers",
    "users",
    "retention",
}

LOWER_IS_BETTER_HINTS = {
    "burn",
    "expense",
    "cost",
    "debt",
    "churn",
    "loss",
    "downtime",
    "default",
    "liability",
    "delinquency",
}

LOW_VALUE_RISK_THRESHOLDS = {
    "cash": 1.0,
    "margin": 10.0,
    "gross margin": 15.0,
    "ebitda margin": 5.0,
}

HIGH_VALUE_RISK_THRESHOLDS = {
    "burn": 1000000.0,
    "debt": 5000000.0,
    "churn": 10.0,
    "loss": 1000000.0,
}

DEFAULT_SCORING_FORMULA = (
    "final_score = change_score + severity_score + evidence_score + "
    "keyword_score - uncertainty_penalty"
)

SUMMARY_FALLBACK_ACTIONS = [
    "Review the source page for the top-ranked anomaly and confirm the reported figure.",
    "Validate whether the change is temporary or part of a broader trend in the document.",
    "Escalate any low-confidence extraction to manual review before sharing externally.",
]
