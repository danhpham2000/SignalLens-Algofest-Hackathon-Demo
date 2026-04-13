from datetime import datetime
from typing import Any, Dict, List, Optional

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from core.config import get_settings
from models.schemas import AnalysisResult, DocumentRecord, DocumentResult, ExtractionResult, Summary


DOCUMENTS_TABLE = "signallens_documents"
RESULTS_TABLE = "signallens_results"
RAG_SEGMENTS_TABLE = "signallens_rag_segments"


class PostgresRepository:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._initialized = False

    def enabled(self) -> bool:
        return bool(self.settings.database_url)

    def initialize(self) -> Dict[str, Any]:
        if not self.enabled():
            return {"enabled": False, "initialized": False, "error": "DATABASE_URL missing"}

        try:
            with self._connect(autocommit=True) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS signallens_documents (
                            id TEXT PRIMARY KEY,
                            file_name TEXT NOT NULL,
                            file_type TEXT NOT NULL,
                            created_at TIMESTAMPTZ NOT NULL,
                            storage_path TEXT NOT NULL,
                            file_size BIGINT NOT NULL,
                            status TEXT NOT NULL DEFAULT 'uploaded',
                            warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
                            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                        """
                    )
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS signallens_results (
                            document_id TEXT PRIMARY KEY REFERENCES signallens_documents(id) ON DELETE CASCADE,
                            extraction JSONB,
                            analysis JSONB,
                            summary JSONB,
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                        """
                    )
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS signallens_rag_segments (
                            id BIGSERIAL PRIMARY KEY,
                            document_id TEXT NOT NULL REFERENCES signallens_documents(id) ON DELETE CASCADE,
                            segment_id TEXT NOT NULL,
                            finding_id TEXT,
                            page_content TEXT NOT NULL,
                            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            UNIQUE (document_id, segment_id)
                        )
                        """
                    )
                    cur.execute(
                        """
                        CREATE INDEX IF NOT EXISTS idx_signallens_results_updated_at
                        ON signallens_results (updated_at DESC)
                        """
                    )
                    cur.execute(
                        """
                        CREATE INDEX IF NOT EXISTS idx_signallens_rag_segments_document_id
                        ON signallens_rag_segments (document_id)
                        """
                    )
            self._initialized = True
            return {
                "enabled": True,
                "initialized": True,
                "tables": [DOCUMENTS_TABLE, RESULTS_TABLE, RAG_SEGMENTS_TABLE],
            }
        except Exception as exc:
            return {"enabled": True, "initialized": False, "error": str(exc)}

    def upsert_document(self, document: DocumentRecord) -> None:
        if not self.enabled():
            return

        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO signallens_documents (
                        id, file_name, file_type, created_at, storage_path, file_size, status, warnings, metadata, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (id) DO UPDATE SET
                        file_name = EXCLUDED.file_name,
                        file_type = EXCLUDED.file_type,
                        storage_path = EXCLUDED.storage_path,
                        file_size = EXCLUDED.file_size,
                        status = EXCLUDED.status,
                        warnings = EXCLUDED.warnings,
                        metadata = EXCLUDED.metadata,
                        updated_at = NOW()
                    """,
                    (
                        document.id,
                        document.file_name,
                        document.file_type,
                        document.created_at,
                        document.storage_path,
                        document.file_size,
                        document.status,
                        Jsonb(document.warnings),
                        Jsonb(document.metadata),
                    ),
                )
            conn.commit()

    def upsert_result(
        self,
        document_id: str,
        extraction: Optional[ExtractionResult],
        analysis: Optional[AnalysisResult],
        summary: Optional[Summary],
    ) -> None:
        if not self.enabled():
            return

        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO signallens_results (
                        document_id, extraction, analysis, summary, updated_at
                    )
                    VALUES (%s, %s, %s, %s, NOW())
                    ON CONFLICT (document_id) DO UPDATE SET
                        extraction = COALESCE(EXCLUDED.extraction, signallens_results.extraction),
                        analysis = COALESCE(EXCLUDED.analysis, signallens_results.analysis),
                        summary = COALESCE(EXCLUDED.summary, signallens_results.summary),
                        updated_at = NOW()
                    """,
                    (
                        document_id,
                        Jsonb(extraction.model_dump(mode="json")) if extraction else None,
                        Jsonb(analysis.model_dump(mode="json")) if analysis else None,
                        Jsonb(summary.model_dump(mode="json")) if summary else None,
                    ),
                )
            conn.commit()

    def get_document(self, document_id: str) -> Optional[DocumentRecord]:
        if not self.enabled():
            return None

        with self._connect(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, file_name, file_type, created_at, storage_path, file_size, status, warnings, metadata
                    FROM signallens_documents
                    WHERE id = %s
                    """,
                    (document_id,),
                )
                row = cur.fetchone()
        if not row:
            return None
        return DocumentRecord.model_validate(row)

    def get_result(self, document_id: str) -> Optional[DocumentResult]:
        if not self.enabled():
            return None

        with self._connect(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        d.id,
                        d.file_name,
                        d.file_type,
                        d.created_at,
                        d.storage_path,
                        d.file_size,
                        d.status,
                        d.warnings,
                        d.metadata,
                        r.extraction,
                        r.analysis,
                        r.summary
                    FROM signallens_documents d
                    LEFT JOIN signallens_results r ON r.document_id = d.id
                    WHERE d.id = %s
                    """,
                    (document_id,),
                )
                row = cur.fetchone()
        if not row:
            return None

        document = DocumentRecord.model_validate(
            {
                "id": row["id"],
                "file_name": row["file_name"],
                "file_type": row["file_type"],
                "created_at": row["created_at"],
                "storage_path": row["storage_path"],
                "file_size": row["file_size"],
                "status": row["status"],
                "warnings": row["warnings"] or [],
                "metadata": row["metadata"] or {},
            }
        )
        extraction = ExtractionResult.model_validate(row["extraction"]) if row.get("extraction") else None
        analysis = AnalysisResult.model_validate(row["analysis"]) if row.get("analysis") else None
        summary = Summary.model_validate(row["summary"]) if row.get("summary") else None
        return DocumentResult(document=document, extraction=extraction, analysis=analysis, summary=summary)

    def save_rag_segments(self, document_id: str, segments: List[Dict[str, Any]]) -> int:
        if not self.enabled() or not segments:
            return 0

        with self._connect() as conn:
            with conn.cursor() as cur:
                for segment in segments:
                    cur.execute(
                        """
                        INSERT INTO signallens_rag_segments (
                            document_id, segment_id, finding_id, page_content, metadata, created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (document_id, segment_id) DO UPDATE SET
                            finding_id = EXCLUDED.finding_id,
                            page_content = EXCLUDED.page_content,
                            metadata = EXCLUDED.metadata
                        """,
                        (
                            document_id,
                            segment["segment_id"],
                            segment.get("finding_id"),
                            segment["page_content"],
                            Jsonb(segment.get("metadata") or {}),
                        ),
                    )
            conn.commit()
        return len(segments)

    def get_recent_runs(self, limit: int = 10) -> List[Dict[str, Any]]:
        if not self.enabled():
            return []

        with self._connect(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        d.id AS document_id,
                        d.file_name,
                        d.file_type,
                        d.status,
                        d.created_at,
                        r.updated_at,
                        COALESCE(jsonb_array_length(r.analysis -> 'findings'), 0) AS finding_count,
                        COALESCE(r.summary ->> 'headline', '') AS headline
                    FROM signallens_documents d
                    LEFT JOIN signallens_results r ON r.document_id = d.id
                    ORDER BY COALESCE(r.updated_at, d.created_at) DESC
                    LIMIT %s
                    """,
                    (limit,),
                )
                return list(cur.fetchall())

    def get_rag_segments(self, document_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        if not self.enabled():
            return []

        with self._connect(row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT segment_id, finding_id, page_content, metadata, created_at
                    FROM signallens_rag_segments
                    WHERE document_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    (document_id, limit),
                )
                return list(cur.fetchall())

    def status(self) -> Dict[str, Any]:
        initialized = self._initialized
        if not self.enabled():
            return {
                "enabled": False,
                "connected": False,
                "initialized": False,
                "tables": [DOCUMENTS_TABLE, RESULTS_TABLE, RAG_SEGMENTS_TABLE],
            }

        try:
            with self._connect(row_factory=dict_row) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT current_database() AS database_name")
                    database_name = cur.fetchone()["database_name"]
            return {
                "enabled": True,
                "connected": True,
                "initialized": initialized,
                "database_name": database_name,
                "tables": [DOCUMENTS_TABLE, RESULTS_TABLE, RAG_SEGMENTS_TABLE],
            }
        except Exception as exc:
            return {
                "enabled": True,
                "connected": False,
                "initialized": initialized,
                "tables": [DOCUMENTS_TABLE, RESULTS_TABLE, RAG_SEGMENTS_TABLE],
                "error": str(exc),
            }

    def _connect(self, autocommit: bool = False, row_factory=None):
        return psycopg.connect(
            self.settings.database_url,
            autocommit=autocommit,
            row_factory=row_factory,
            connect_timeout=10,
        )


postgres_repository = PostgresRepository()
