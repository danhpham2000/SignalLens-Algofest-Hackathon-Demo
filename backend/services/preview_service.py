from io import BytesIO
from pathlib import Path

import pymupdf
from fastapi import HTTPException, status
from PIL import Image

from services.storage_service import storage_service

RESAMPLING_LANCZOS = getattr(Image, "Resampling", Image).LANCZOS


class PreviewService:
    def render_page_preview(self, document_id: str, page_number: int, max_width: int = 1200) -> bytes:
        document = storage_service.get_document(document_id)
        path = Path(document.storage_path)

        if document.file_type == "pdf":
            return self._render_pdf_page(path, page_number, max_width=max_width)

        if page_number != 1:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image documents expose only page 1.",
            )

        return self._render_image(path, max_width=max_width)

    def _render_pdf_page(self, path: Path, page_number: int, max_width: int) -> bytes:
        pdf = pymupdf.open(path)
        try:
            if page_number < 1 or page_number > len(pdf):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Requested page is out of range.",
                )

            page = pdf[page_number - 1]
            scale = min(2.4, max(1.0, max_width / max(page.rect.width, 1)))
            pixmap = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
            return pixmap.tobytes("png")
        finally:
            pdf.close()

    def _render_image(self, path: Path, max_width: int) -> bytes:
        with Image.open(path) as image:
            normalized = image.convert("RGB")
            if normalized.width > max_width:
                ratio = max_width / normalized.width
                normalized = normalized.resize(
                    (max_width, max(1, int(normalized.height * ratio))),
                    RESAMPLING_LANCZOS,
                )

            output = BytesIO()
            normalized.save(output, format="PNG")
            return output.getvalue()


preview_service = PreviewService()
