from core.config import get_settings
from db.neo4j_repo import neo4j_repository
from db.postgres import postgres_repository


class DemoService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def overview(self):
        return {
            "product": "SignalLens",
            "supported_inputs": ["pdf", "png", "jpg", "jpeg", "webp"],
            "pipeline": ["upload", "extract", "analyze", "explain", "result"],
            "features": {
                "openai_explanations": self.settings.openai_enabled,
                "neo4j_sync": self.settings.neo4j_enabled,
                "database_url_present": bool(self.settings.database_url),
            },
            "integrations": {
                "postgres": postgres_repository.status(),
                "neo4j": neo4j_repository.connection_status(),
            },
        }

    def database_demo(self):
        return {
            "postgres": postgres_repository.status(),
            "recent_runs": postgres_repository.get_recent_runs(limit=10),
        }

    def rag_demo(self, document_id: str):
        return {
            "document_id": document_id,
            "postgres": postgres_repository.status(),
            "segments": postgres_repository.get_rag_segments(document_id, limit=20),
        }


demo_service = DemoService()
