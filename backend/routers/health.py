from fastapi import APIRouter

from core.config import get_settings
from db.neo4j_repo import neo4j_repository
from db.postgres import postgres_repository


router = APIRouter(tags=["health"])


@router.get("/health/live")
async def health_live():
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_name,
    }


@router.get("/health")
async def health_check():
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_name,
        "openai_enabled": settings.openai_enabled,
        "neo4j_enabled": settings.neo4j_enabled,
        "database_url_present": bool(settings.database_url),
        "neo4j_status": neo4j_repository.connection_status(),
        "postgres_status": postgres_repository.status(),
    }
