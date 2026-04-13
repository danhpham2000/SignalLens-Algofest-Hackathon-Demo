from fastapi import APIRouter

from services.demo_service import demo_service


router = APIRouter(tags=["demo"])


@router.get("/demo/overview")
async def demo_overview():
    return demo_service.overview()


@router.get("/demo/database")
async def demo_database():
    return demo_service.database_demo()


@router.get("/demo/rag/{document_id}")
async def demo_rag(document_id: str):
    return demo_service.rag_demo(document_id)
