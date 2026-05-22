from fastapi import APIRouter, Query, Response

from models.schemas import AnalysisResult, DocumentRequest, DocumentResult, ExtractionResult
from services.analysis_service import analysis_service
from services.preview_service import preview_service


router = APIRouter(tags=["results"])


@router.post("/extract", response_model=ExtractionResult)
async def extract_document(payload: DocumentRequest):
    return analysis_service.run_extraction(payload.document_id)


@router.post("/analyze", response_model=AnalysisResult)
async def analyze_document(payload: DocumentRequest):
    return analysis_service.run_analysis(payload.document_id)


@router.post("/explain", response_model=DocumentResult)
async def explain_document(payload: DocumentRequest):
    return analysis_service.run_explanation(payload.document_id)


@router.get("/result/{document_id}", response_model=DocumentResult)
async def get_result(document_id: str, ensure_complete: bool = Query(True)):
    return analysis_service.get_result(document_id, ensure_complete=ensure_complete)


@router.api_route(
    "/result/{document_id}/pages/{page_number}/preview",
    methods=["GET", "HEAD"],
)
async def get_page_preview(
    document_id: str,
    page_number: int,
    max_width: int = Query(1200, ge=320, le=2000),
):
    image_bytes = preview_service.render_page_preview(
        document_id=document_id,
        page_number=page_number,
        max_width=max_width,
    )
    return Response(content=image_bytes, media_type="image/png")
