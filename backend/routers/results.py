from fastapi import APIRouter, Query

from models.schemas import AnalysisResult, DocumentRequest, DocumentResult, ExtractionResult
from services.analysis_service import analysis_service


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
