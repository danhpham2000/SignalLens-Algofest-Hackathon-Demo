from datetime import datetime
from threading import RLock
from typing import Dict, Optional
from uuid import uuid4

from fastapi import HTTPException, status

from db.postgres import postgres_repository
from models.schemas import AnalysisResult, DocumentRecord, DocumentResult, ExtractionResult, Summary


class StorageService:
    def __init__(self) -> None:
        self._documents: Dict[str, DocumentRecord] = {}
        self._extractions: Dict[str, ExtractionResult] = {}
        self._analyses: Dict[str, AnalysisResult] = {}
        self._summaries: Dict[str, Summary] = {}
        self._lock = RLock()

    def create_document(self, file_name: str, file_type: str, storage_path: str, file_size: int) -> DocumentRecord:
        document = DocumentRecord(
            id=uuid4().hex,
            file_name=file_name,
            file_type=file_type,
            created_at=datetime.now(),
            storage_path=storage_path,
            file_size=file_size,
        )
        with self._lock:
            self._documents[document.id] = document
        self._persist_document(document)
        return document

    def get_document(self, document_id: str) -> DocumentRecord:
        with self._lock:
            document = self._documents.get(document_id)
        if not document:
            hydrated = self._hydrate_from_postgres(document_id)
            document = hydrated.document if hydrated else None
        if not document:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
        return document

    def update_document(self, document: DocumentRecord) -> DocumentRecord:
        with self._lock:
            self._documents[document.id] = document
        self._persist_document(document)
        return document

    def save_extraction(self, extraction: ExtractionResult) -> ExtractionResult:
        with self._lock:
            document = self.get_document(extraction.document_id)
            document.status = "extracted"
            self._documents[document.id] = document
            self._extractions[extraction.document_id] = extraction
        self._persist_document(document)
        self._persist_result(extraction.document_id)
        return extraction

    def get_extraction(self, document_id: str) -> Optional[ExtractionResult]:
        with self._lock:
            extraction = self._extractions.get(document_id)
        if extraction:
            return extraction
        hydrated = self._hydrate_from_postgres(document_id)
        return hydrated.extraction if hydrated else None

    def save_analysis(self, analysis: AnalysisResult) -> AnalysisResult:
        with self._lock:
            document = self.get_document(analysis.document_id)
            document.status = "analyzed"
            self._documents[document.id] = document
            self._analyses[analysis.document_id] = analysis
        self._persist_document(document)
        self._persist_result(analysis.document_id)
        return analysis

    def get_analysis(self, document_id: str) -> Optional[AnalysisResult]:
        with self._lock:
            analysis = self._analyses.get(document_id)
        if analysis:
            return analysis
        hydrated = self._hydrate_from_postgres(document_id)
        return hydrated.analysis if hydrated else None

    def save_summary(self, summary: Summary) -> Summary:
        with self._lock:
            document = self.get_document(summary.document_id)
            document.status = "explained"
            self._documents[document.id] = document
            self._summaries[summary.document_id] = summary
        self._persist_document(document)
        self._persist_result(summary.document_id)
        return summary

    def get_summary(self, document_id: str) -> Optional[Summary]:
        with self._lock:
            summary = self._summaries.get(document_id)
        if summary:
            return summary
        hydrated = self._hydrate_from_postgres(document_id)
        return hydrated.summary if hydrated else None

    def build_result(self, document_id: str) -> DocumentResult:
        with self._lock:
            document = self._documents.get(document_id)
            extraction = self._extractions.get(document_id)
            analysis = self._analyses.get(document_id)
            summary = self._summaries.get(document_id)
        if not document:
            hydrated = self._hydrate_from_postgres(document_id)
            if hydrated:
                return hydrated
            document = self.get_document(document_id)
        with self._lock:
            extraction = extraction or self._extractions.get(document_id)
            analysis = analysis or self._analyses.get(document_id)
            summary = summary or self._summaries.get(document_id)
        return DocumentResult(
            document=document,
            extraction=extraction,
            analysis=analysis,
            summary=summary,
        )

    def initialize_persistence(self):
        return postgres_repository.initialize()

    def _persist_document(self, document: DocumentRecord) -> None:
        try:
            postgres_repository.upsert_document(document)
        except Exception:
            return

    def _persist_result(self, document_id: str) -> None:
        try:
            with self._lock:
                extraction = self._extractions.get(document_id)
                analysis = self._analyses.get(document_id)
                summary = self._summaries.get(document_id)
            postgres_repository.upsert_result(document_id, extraction, analysis, summary)
        except Exception:
            return

    def _hydrate_from_postgres(self, document_id: str) -> Optional[DocumentResult]:
        try:
            result = postgres_repository.get_result(document_id)
        except Exception:
            return None
        if not result:
            return None

        with self._lock:
            self._documents[result.document.id] = result.document
            if result.extraction:
                self._extractions[result.document.id] = result.extraction
            if result.analysis:
                self._analyses[result.document.id] = result.analysis
            if result.summary:
                self._summaries[result.document.id] = result.summary
        return result


storage_service = StorageService()
