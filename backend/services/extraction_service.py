from collections import OrderedDict
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import re
import shutil
from uuid import uuid4

import pdfplumber
import pymupdf
import pytesseract
from PIL import Image
from openai import OpenAI

from core.config import get_settings
from core.constants import IMAGE_CHUNK_TYPE, OCR_CHUNK_TYPE, TABLE_CHUNK_TYPE, TEXT_CHUNK_TYPE
from models.schemas import BoundingBox, Chunk, DocumentRecord, ExtractionResult, Metric


NUMERIC_PATTERN = re.compile(
    r"(?P<currency>[$€£])?\s*(?P<negative>\()?[\+\-]?\s*"
    r"(?P<number>\d[\d,]*(?:\.\d+)?)\s*(?P<suffix>%|bps|x|k|K|m|M|mm|MM|bn|BN|b|B)?\)?"
)


class ExtractionService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._openai_client: Optional[OpenAI] = None

    def extract_document(self, document: DocumentRecord) -> ExtractionResult:
        path = Path(document.storage_path)
        if document.file_type == "pdf":
            extraction = self._extract_pdf(document, path)
        else:
            extraction = self._extract_image(document, path)

        metrics = self._deduplicate_metrics(self._extract_metrics(document.id, extraction.chunks))
        extraction.metrics = metrics
        extraction.metric_count = len(metrics)
        return extraction

    def _extract_pdf(self, document: DocumentRecord, path: Path) -> ExtractionResult:
        chunks: List[Chunk] = []
        warnings: List[str] = []
        table_count = 0

        fitz_document = pymupdf.open(path)
        with pdfplumber.open(path) as plumber_document:
            for page_index, page in enumerate(fitz_document, start=1):
                text_length = 0
                page_dict = page.get_text("dict")
                for block in page_dict.get("blocks", []):
                    if block.get("type") != 0:
                        continue

                    text = self._flatten_block_text(block)
                    if not text:
                        continue

                    bbox = self._build_bbox(block.get("bbox"))
                    chunks.append(
                        Chunk(
                            id=uuid4().hex,
                            document_id=document.id,
                            page_number=page_index,
                            chunk_type=TEXT_CHUNK_TYPE,
                            text=text,
                            bbox=bbox,
                            metadata={"source": "pdf_text"},
                        )
                    )
                    text_length += len(text)

                plumber_page = plumber_document.pages[page_index - 1]
                raw_tables = plumber_page.extract_tables() or []
                for table_index, table in enumerate(raw_tables):
                    headers, rows, table_text = self._normalize_table(table)
                    if not table_text:
                        continue
                    table_count += 1
                    chunks.append(
                        Chunk(
                            id=uuid4().hex,
                            document_id=document.id,
                            page_number=page_index,
                            chunk_type=TABLE_CHUNK_TYPE,
                            text=table_text,
                            metadata={
                                "source": "pdf_table",
                                "table_index": table_index,
                                "headers": headers,
                                "rows": rows,
                            },
                        )
                    )

                if text_length < 60:
                    ocr_text, source = self._ocr_pdf_page(page)
                    if ocr_text:
                        chunks.append(
                            Chunk(
                                id=uuid4().hex,
                                document_id=document.id,
                                page_number=page_index,
                                chunk_type=OCR_CHUNK_TYPE,
                                text=ocr_text,
                                metadata={"source": source},
                            )
                        )
                    else:
                        warnings.append(
                            "Page {page} had limited selectable text and OCR fallback was unavailable.".format(
                                page=page_index
                            )
                        )

        fitz_document.close()

        return ExtractionResult(
            document_id=document.id,
            file_name=document.file_name,
            file_type=document.file_type,
            chunk_count=len(chunks),
            metric_count=0,
            table_count=table_count,
            chunks=chunks,
            metrics=[],
            metadata={"warnings": warnings},
        )

    def _extract_image(self, document: DocumentRecord, path: Path) -> ExtractionResult:
        warnings: List[str] = []
        ocr_text, source = self._ocr_image_path(path)
        if not ocr_text:
            warnings.append("OCR did not return any text for the uploaded image.")

        chunks = [
            Chunk(
                id=uuid4().hex,
                document_id=document.id,
                page_number=1,
                chunk_type=IMAGE_CHUNK_TYPE if ocr_text else OCR_CHUNK_TYPE,
                text=ocr_text or "No text extracted from image.",
                metadata={"source": source or "none"},
            )
        ]

        return ExtractionResult(
            document_id=document.id,
            file_name=document.file_name,
            file_type=document.file_type,
            chunk_count=len(chunks),
            metric_count=0,
            table_count=0,
            chunks=chunks,
            metrics=[],
            metadata={"warnings": warnings},
        )

    def _flatten_block_text(self, block: Dict[str, Any]) -> str:
        lines: List[str] = []
        for line in block.get("lines", []):
            spans = [span.get("text", "") for span in line.get("spans", [])]
            line_text = "".join(spans).strip()
            if line_text:
                lines.append(line_text)
        return "\n".join(lines).strip()

    def _build_bbox(self, raw_bbox: Optional[List[float]]) -> Optional[BoundingBox]:
        if not raw_bbox or len(raw_bbox) != 4:
            return None
        return BoundingBox(x0=raw_bbox[0], y0=raw_bbox[1], x1=raw_bbox[2], y1=raw_bbox[3])

    def _normalize_table(self, table: List[List[Optional[str]]]) -> Tuple[List[str], List[List[str]], str]:
        cleaned_rows: List[List[str]] = []
        for row in table:
            normalized_row = [self._normalize_cell(cell) for cell in row]
            if any(normalized_row):
                cleaned_rows.append(normalized_row)

        if not cleaned_rows:
            return [], [], ""

        headers = cleaned_rows[0]
        table_text = "\n".join(" | ".join(cell or "-" for cell in row) for row in cleaned_rows)
        return headers, cleaned_rows, table_text

    def _normalize_cell(self, cell: Optional[str]) -> str:
        if cell is None:
            return ""
        return re.sub(r"\s+", " ", str(cell)).strip()

    def _ocr_pdf_page(self, page: pymupdf.Page) -> Tuple[str, str]:
        pixmap = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)
        image_bytes = pixmap.tobytes("png")
        return self._ocr_image_bytes(image_bytes)

    def _ocr_image_path(self, path: Path) -> Tuple[str, str]:
        return self._ocr_image_bytes(path.read_bytes())

    def _ocr_image_bytes(self, image_bytes: bytes) -> Tuple[str, str]:
        tesseract_text = self._tesseract_ocr(image_bytes)
        if tesseract_text:
            return tesseract_text, "tesseract"

        vision_text = self._openai_vision_ocr(image_bytes)
        if vision_text:
            return vision_text, "openai_vision"

        return "", ""

    def _tesseract_ocr(self, image_bytes: bytes) -> str:
        if not shutil.which("tesseract"):
            return ""

        try:
            image = Image.open(BytesIO(image_bytes))
            return pytesseract.image_to_string(image).strip()
        except Exception:
            return ""

    def _openai_vision_ocr(self, image_bytes: bytes) -> str:
        if not self.settings.openai_enabled:
            return ""

        try:
            client = self._get_openai_client()
            response = client.responses.create(
                model=self.settings.openai_vision_model,
                input=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "input_text",
                                "text": (
                                    "Extract all visible text from this financial document image. "
                                    "Return plain text only, preserve line breaks, and keep table-like rows readable."
                                ),
                            },
                            {
                                "type": "input_image",
                                "image_url": "data:image/png;base64,{data}".format(
                                    data=self._to_base64(image_bytes)
                                ),
                            },
                        ],
                    }
                ],
                temperature=0,
                max_output_tokens=1800,
                timeout=self.settings.openai_timeout_seconds,
            )
            return getattr(response, "output_text", "").strip()
        except Exception:
            return ""

    def _get_openai_client(self) -> OpenAI:
        if self._openai_client is None:
            self._openai_client = OpenAI(api_key=self.settings.openai_api_key)
        return self._openai_client

    def _to_base64(self, raw_bytes: bytes) -> str:
        import base64

        return base64.b64encode(raw_bytes).decode("utf-8")

    def _extract_metrics(self, document_id: str, chunks: List[Chunk]) -> List[Metric]:
        metrics: List[Metric] = []
        sequence_index = 0
        for chunk in chunks:
            if chunk.chunk_type == TABLE_CHUNK_TYPE:
                chunk_metrics = self._extract_metrics_from_table(document_id, chunk, sequence_index)
            else:
                chunk_metrics = self._extract_metrics_from_text(document_id, chunk, sequence_index)

            metrics.extend(chunk_metrics)
            sequence_index += len(chunk_metrics)

        return metrics

    def _extract_metrics_from_table(self, document_id: str, chunk: Chunk, sequence_index: int) -> List[Metric]:
        metrics: List[Metric] = []
        headers = chunk.metadata.get("headers") or []
        rows = chunk.metadata.get("rows") or []
        data_rows = rows[1:] if len(rows) > 1 else rows

        for row_index, row in enumerate(data_rows):
            if not row:
                continue

            label = self._clean_metric_name(row[0])
            if not label:
                continue

            for column_index, cell in enumerate(row[1:], start=1):
                parsed = self._parse_numeric_value(cell)
                if not parsed:
                    continue

                header = headers[column_index] if column_index < len(headers) else "column_{index}".format(index=column_index)
                metrics.append(
                    Metric(
                        id=uuid4().hex,
                        document_id=document_id,
                        name=label,
                        value=parsed["value"],
                        unit=parsed["unit"],
                        period=header,
                        context_chunk_id=chunk.id,
                        raw_text=cell,
                        evidence_ids=[chunk.id],
                        metadata={
                            "series_key": self._series_key(label),
                            "source": chunk.chunk_type,
                            "row_index": row_index,
                            "column_index": column_index,
                            "sequence_index": sequence_index + len(metrics),
                            "raw_unit": parsed["raw_unit"],
                        },
                    )
                )

        return metrics

    def _extract_metrics_from_text(self, document_id: str, chunk: Chunk, sequence_index: int) -> List[Metric]:
        metrics: List[Metric] = []
        candidate_lines = [line.strip() for line in chunk.text.splitlines() if line.strip()]
        active_label = ""

        for line in candidate_lines:
            period, numeric_line = self._split_period_prefix(line)
            numeric_matches = list(NUMERIC_PATTERN.finditer(numeric_line))
            if not numeric_matches:
                candidate_label = self._clean_metric_name(line)
                if candidate_label and self._is_metric_label(candidate_label):
                    active_label = candidate_label
                continue

            label_prefix = numeric_line[: numeric_matches[0].start()]
            label = self._clean_metric_name(label_prefix)
            if not label or self._looks_like_period_label(label):
                label = active_label or self._guess_label_from_line(line)
            if not label:
                continue

            comparable_line = bool(re.search(r"\b(vs|versus|from|prior|previous|prev)\b", numeric_line.lower()))
            for match_index, match in enumerate(numeric_matches):
                parsed = self._parse_numeric_value(match.group(0))
                if not parsed:
                    continue

                if comparable_line and len(numeric_matches) >= 2:
                    metric_period = "current" if match_index == 0 else "previous"
                elif len(numeric_matches) > 1:
                    metric_period = "point_{index}".format(index=match_index + 1)
                else:
                    metric_period = period

                metrics.append(
                    Metric(
                        id=uuid4().hex,
                        document_id=document_id,
                        name=label,
                        value=parsed["value"],
                        unit=parsed["unit"],
                        period=metric_period,
                        context_chunk_id=chunk.id,
                        raw_text=line,
                        evidence_ids=[chunk.id],
                        metadata={
                            "series_key": self._series_key(label),
                            "source": chunk.chunk_type,
                            "sequence_index": sequence_index + len(metrics),
                            "raw_unit": parsed["raw_unit"],
                            "line": line,
                        },
                    )
                )

        return metrics

    def _parse_numeric_value(self, raw_value: str) -> Optional[Dict[str, Any]]:
        match = NUMERIC_PATTERN.search(raw_value)
        if not match:
            return None

        number_text = match.group("number").replace(",", "")
        try:
            value = float(number_text)
        except ValueError:
            return None

        token = match.group(0).strip()
        if "(" in token and ")" in token:
            value = -abs(value)
        if token.startswith("-"):
            value = -abs(value)

        raw_suffix = match.group("suffix") or ""
        suffix = raw_suffix.lower()
        multiplier = 1.0
        unit = None

        if suffix in {"k"}:
            multiplier = 1000.0
        elif suffix in {"m", "mm"}:
            multiplier = 1000000.0
        elif suffix in {"b", "bn"}:
            multiplier = 1000000000.0
        elif suffix == "%":
            unit = "%"
        elif suffix == "bps":
            unit = "bps"
        elif suffix == "x":
            unit = "x"

        if match.group("currency"):
            unit = "$"
        elif not unit and raw_suffix:
            unit = raw_suffix

        return {
            "value": value * multiplier,
            "unit": unit,
            "raw_unit": raw_suffix,
        }

    def _clean_metric_name(self, value: str) -> str:
        cleaned = re.sub(r"[\|\:\-\u2022]+$", "", value).strip()
        cleaned = re.sub(r"\s+", " ", cleaned)
        cleaned = cleaned.strip(" :|-")
        if len(cleaned) < 2 or not re.search(r"[A-Za-z]", cleaned):
            return ""
        return cleaned[:80]

    def _guess_label_from_line(self, line: str) -> str:
        tokens = re.split(r"[\|\:]", line)
        for token in tokens:
            cleaned = self._clean_metric_name(token)
            if cleaned and len(cleaned.split()) <= 8:
                return cleaned
        return ""

    def _split_period_prefix(self, line: str) -> Tuple[Optional[str], str]:
        patterns = [
            r"^(?P<period>Q[1-4]\s+\d{4})\s+(?P<rest>.+)$",
            r"^(?P<period>FY\s*\d{2,4})\s+(?P<rest>.+)$",
            r"^(?P<period>H[12]\s+\d{4})\s+(?P<rest>.+)$",
            r"^(?P<period>[A-Za-z]{3,9}\s+\d{4})\s+(?P<rest>.+)$",
            r"^(?P<period>\d{4})\s+(?P<rest>.+)$",
        ]
        for pattern in patterns:
            match = re.match(pattern, line, flags=re.IGNORECASE)
            if match:
                return match.group("period"), match.group("rest")
        return None, line

    def _is_metric_label(self, candidate: str) -> bool:
        if self._looks_like_period_label(candidate):
            return False
        return len(candidate.split()) <= 8

    def _looks_like_period_label(self, candidate: str) -> bool:
        return bool(
            re.fullmatch(
                r"(q[1-4](?:\s+\d{4})?|fy\s*\d{2,4}|h[12](?:\s+\d{4})?|20\d{2})",
                candidate.strip().lower(),
            )
        )

    def _series_key(self, label: str) -> str:
        return re.sub(r"[^a-z0-9]+", "_", label.lower()).strip("_")

    def _deduplicate_metrics(self, metrics: List[Metric]) -> List[Metric]:
        unique_metrics: "OrderedDict[Tuple[str, float, Optional[str], str], Metric]" = OrderedDict()
        for metric in metrics:
            key = (
                metric.name.lower(),
                round(metric.value, 4),
                metric.period,
                metric.context_chunk_id,
            )
            unique_metrics.setdefault(key, metric)
        return list(unique_metrics.values())


extraction_service = ExtractionService()
