from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import List, Optional, Tuple
import os

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _split_csv(value: Optional[str], default: List[str]) -> List[str]:
    if not value:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


def _build_neo4j_uri() -> Tuple[Optional[str], str]:
    explicit_uri = os.getenv("NEO4J_URI")
    if explicit_uri:
        return explicit_uri, "explicit"

    client_id = os.getenv("NEO4J_CLIENT_ID")
    if not client_id:
        return None, "missing"

    normalized = client_id.strip()
    if normalized.startswith("neo4j+s://") or normalized.startswith("neo4j://"):
        return normalized, "client_id_uri"
    if normalized.endswith(".databases.neo4j.io"):
        return "neo4j+s://{host}".format(host=normalized), "client_id_host"
    return "neo4j+s://{client_id}.databases.neo4j.io".format(client_id=normalized), "client_id_inferred"


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "SignalLens API")
    environment: str = os.getenv("ENVIRONMENT", "development")
    cors_origins: List[str] = field(
        default_factory=lambda: _split_csv(
            os.getenv("CORS_ORIGINS"),
            ["http://localhost:3000", "http://127.0.0.1:3000"],
        )
    )
    cors_origin_regex: Optional[str] = os.getenv("CORS_ORIGIN_REGEX")
    upload_dir: Path = BASE_DIR / "temp" / "uploads"
    demo_dir: Path = BASE_DIR / "temp" / "demo"
    max_upload_mb: int = int(os.getenv("MAX_UPLOAD_MB", "15"))
    max_findings: int = int(os.getenv("MAX_FINDINGS", "5"))
    openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    openai_vision_model: str = os.getenv("OPENAI_VISION_MODEL", os.getenv("OPENAI_MODEL", "gpt-4o-mini"))
    openai_embedding_model: str = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
    openai_timeout_seconds: float = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "20"))
    neo4j_timeout_seconds: float = float(os.getenv("NEO4J_TIMEOUT_SECONDS", "4"))
    neo4j_uri: Optional[str] = field(default_factory=lambda: _build_neo4j_uri()[0])
    neo4j_uri_source: str = field(default_factory=lambda: _build_neo4j_uri()[1])
    neo4j_user: Optional[str] = os.getenv("NEO4J_USER")
    neo4j_password: Optional[str] = os.getenv("NEO4J_PASSWORD")
    database_url: Optional[str] = os.getenv("DATABASE_URL")

    @property
    def neo4j_enabled(self) -> bool:
        return bool(self.neo4j_uri and self.neo4j_user and self.neo4j_password)

    @property
    def openai_enabled(self) -> bool:
        return bool(self.openai_api_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.demo_dir.mkdir(parents=True, exist_ok=True)
    return settings
