from typing import Dict, List, Optional, Tuple
import json

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document as LangChainDocument
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings
from openai import OpenAI

from core.config import get_settings
from core.constants import SUMMARY_FALLBACK_ACTIONS
from db.postgres import postgres_repository
from models.schemas import AnalysisResult, Chunk, DocumentRecord, ExtractionResult, Finding, Summary


class ExplanationService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._openai_client = None
        self._embeddings: Optional[OpenAIEmbeddings] = None
        self._splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=60)

    def explain(
        self,
        document: DocumentRecord,
        extraction: ExtractionResult,
        analysis: AnalysisResult,
    ) -> Tuple[AnalysisResult, Summary]:
        if not analysis.findings:
            return analysis, self._build_empty_summary(document, extraction)

        evidence_context = self._build_retrieval_context(extraction, analysis.findings)
        self._persist_rag_context(document.id, evidence_context)

        if self.settings.openai_enabled:
            try:
                payload = self._generate_with_openai(document, analysis.findings, evidence_context)
                return self._merge_openai_payload(analysis, payload)
            except Exception:
                pass

        return self._build_fallback_output(document, extraction, analysis)

    def _build_retrieval_context(
        self, extraction: ExtractionResult, findings: List[Finding]
    ) -> Dict[str, List[Dict[str, str]]]:
        base_documents = [
            LangChainDocument(
                page_content=chunk.text,
                metadata={
                    "chunk_id": chunk.id,
                    "page_number": chunk.page_number,
                    "chunk_type": chunk.chunk_type,
                },
            )
            for chunk in extraction.chunks
            if chunk.text.strip()
        ]

        split_documents = self._splitter.split_documents(base_documents)
        for index, doc in enumerate(split_documents):
            doc.metadata["segment_id"] = "{chunk_id}::{index}".format(
                chunk_id=doc.metadata.get("chunk_id", "segment"),
                index=index,
            )

        lookup = {chunk.id: chunk for chunk in extraction.chunks}
        context_by_finding: Dict[str, List[Dict[str, str]]] = {}
        vector_store = self._build_vector_store(split_documents)

        for finding in findings:
            query_terms = self._finding_query_terms(finding)
            if vector_store is not None:
                retrieval_query = self._build_retrieval_query(finding)
                candidate_segments = vector_store.similarity_search(retrieval_query, k=8)
                ranked_segments = sorted(
                    candidate_segments,
                    key=lambda doc: self._segment_score(doc, query_terms, finding.evidence_ids),
                    reverse=True,
                )
            else:
                ranked_segments = sorted(
                    split_documents,
                    key=lambda doc: self._segment_score(doc, query_terms, finding.evidence_ids),
                    reverse=True,
                )

            selected: List[Dict[str, str]] = []
            for segment in ranked_segments[:4]:
                chunk_id = segment.metadata.get("chunk_id")
                source_chunk = lookup.get(chunk_id)
                selected.append(
                    {
                        "segment_id": str(segment.metadata.get("segment_id", "")),
                        "chunk_id": str(chunk_id),
                        "page_number": str(segment.metadata.get("page_number", "")),
                        "chunk_type": str(segment.metadata.get("chunk_type", "")),
                        "text": segment.page_content[:600],
                        "source_excerpt": source_chunk.text[:240] if source_chunk else segment.page_content[:240],
                    }
                )
            context_by_finding[finding.id] = selected

        return context_by_finding

    def _finding_query_terms(self, finding: Finding) -> List[str]:
        base_terms = finding.title.lower().replace("%", " ").split()
        for metric_name in finding.metadata.get("metric_names", []):
            base_terms.extend(metric_name.lower().split())
        return [term.strip(" ,.:;") for term in base_terms if len(term.strip(" ,.:;")) > 2]

    def _build_retrieval_query(self, finding: Finding) -> str:
        metric_names = ", ".join(finding.metadata.get("metric_names", []))
        return "finding: {title}. metrics: {metrics}. explanation evidence".format(
            title=finding.title,
            metrics=metric_names,
        )

    def _build_vector_store(self, split_documents: List[LangChainDocument]) -> Optional[InMemoryVectorStore]:
        if not self.settings.openai_enabled or not split_documents:
            return None

        try:
            store = InMemoryVectorStore(self._get_embeddings())
            store.add_documents(
                split_documents,
                ids=[str(document.metadata.get("segment_id")) for document in split_documents],
            )
            return store
        except Exception:
            return None

    def _segment_score(self, document: LangChainDocument, query_terms: List[str], evidence_ids: List[str]) -> float:
        text = document.page_content.lower()
        score = 0.0
        for term in query_terms:
            if term in text:
                score += 1.0
        if document.metadata.get("chunk_id") in evidence_ids:
            score += 3.0
        if document.metadata.get("chunk_type") == "table":
            score += 0.8
        return score

    def _persist_rag_context(self, document_id: str, evidence_context: Dict[str, List[Dict[str, str]]]) -> None:
        segments = []
        for finding_id, items in evidence_context.items():
            for item in items:
                segments.append(
                    {
                        "segment_id": item.get("segment_id") or "{finding_id}:{chunk_id}".format(
                            finding_id=finding_id,
                            chunk_id=item.get("chunk_id", "chunk"),
                        ),
                        "finding_id": finding_id,
                        "page_content": item.get("text", ""),
                        "metadata": {
                            "chunk_id": item.get("chunk_id"),
                            "page_number": item.get("page_number"),
                            "chunk_type": item.get("chunk_type"),
                            "source_excerpt": item.get("source_excerpt"),
                        },
                    }
                )
        try:
            postgres_repository.save_rag_segments(document_id, segments)
        except Exception:
            return

    def _generate_with_openai(
        self,
        document: DocumentRecord,
        findings: List[Finding],
        evidence_context: Dict[str, List[Dict[str, str]]],
    ) -> Dict[str, object]:
        prompt_payload = {
            "document": {
                "id": document.id,
                "file_name": document.file_name,
                "file_type": document.file_type,
            },
            "findings": [
                {
                    "id": finding.id,
                    "title": finding.title,
                    "severity_score": finding.severity_score,
                    "confidence_score": finding.confidence_score,
                    "score_breakdown": finding.score_breakdown.model_dump(),
                    "evidence_context": evidence_context.get(finding.id, []),
                }
                for finding in findings
            ],
        }

        response = self._get_openai_client().responses.create(
            model=self.settings.openai_model,
            instructions=(
                "You are SignalLens, a financial anomaly explainer. Use only the supplied evidence. "
                "If evidence is weak, say so. Return valid JSON only."
            ),
            input=json.dumps(
                {
                    "task": (
                        "Return a JSON object with keys: headline, bullets, recommended_actions, findings. "
                        "Each finding item must include id, explanation, why_it_matters, next_action."
                    ),
                    "payload": prompt_payload,
                }
            ),
            temperature=0.2,
            max_output_tokens=1600,
            timeout=self.settings.openai_timeout_seconds,
        )

        raw_text = getattr(response, "output_text", "")
        return self._extract_json(raw_text)

    def _extract_json(self, raw_text: str) -> Dict[str, object]:
        start = raw_text.find("{")
        end = raw_text.rfind("}")
        if start == -1 or end == -1 or end < start:
            raise ValueError("Model response did not include JSON.")
        return json.loads(raw_text[start : end + 1])

    def _merge_openai_payload(
        self, analysis: AnalysisResult, payload: Dict[str, object]
    ) -> Tuple[AnalysisResult, Summary]:
        finding_payloads = payload.get("findings") or []
        finding_lookup = {item.get("id"): item for item in finding_payloads if isinstance(item, dict)}

        for finding in analysis.findings:
            item = finding_lookup.get(finding.id)
            if not item:
                continue
            finding.explanation = str(item.get("explanation") or finding.explanation)
            finding.why_it_matters = str(item.get("why_it_matters") or finding.why_it_matters)
            finding.next_action = str(item.get("next_action") or finding.next_action)

        summary = Summary(
            document_id=analysis.document_id,
            headline=str(payload.get("headline") or analysis.findings[0].title),
            bullets=[str(item) for item in (payload.get("bullets") or [])[:3]],
            recommended_actions=[str(item) for item in (payload.get("recommended_actions") or [])[:3]],
            generated_with="openai_rag",
        )
        if not summary.bullets:
            summary.bullets = [finding.title for finding in analysis.findings[:3]]
        if not summary.recommended_actions:
            summary.recommended_actions = SUMMARY_FALLBACK_ACTIONS[:]

        return analysis, summary

    def _build_fallback_output(
        self,
        document: DocumentRecord,
        extraction: ExtractionResult,
        analysis: AnalysisResult,
    ) -> Tuple[AnalysisResult, Summary]:
        chunk_lookup = {chunk.id: chunk for chunk in extraction.chunks}

        for finding in analysis.findings:
            primary_chunk = chunk_lookup.get(finding.evidence_ids[0]) if finding.evidence_ids else None
            evidence_phrase = self._describe_evidence(primary_chunk) if primary_chunk else "the extracted document"
            metric_name = finding.metadata.get("metric_names", ["the metric"])[0]
            finding.explanation = (
                "{title}. The score is driven by {metric} and supported by {evidence}.".format(
                    title=finding.title,
                    metric=metric_name,
                    evidence=evidence_phrase,
                )
            )
            finding.why_it_matters = (
                "This stands out because the anomaly score reached {score:.1f} with confidence {confidence:.0%}.".format(
                    score=finding.final_score,
                    confidence=finding.confidence_score,
                )
            )
            finding.next_action = "Review the cited source section and confirm whether the shift is expected."

        headline = analysis.findings[0].title
        bullets = [finding.explanation for finding in analysis.findings[:3]]
        recommended_actions = []
        for finding in analysis.findings[:3]:
            recommended_actions.append(finding.next_action)

        summary = Summary(
            document_id=document.id,
            headline=headline,
            bullets=bullets,
            recommended_actions=recommended_actions or SUMMARY_FALLBACK_ACTIONS[:],
            generated_with="rule_based",
        )
        return analysis, summary

    def _describe_evidence(self, chunk: Chunk) -> str:
        return "page {page} ({kind})".format(page=chunk.page_number, kind=chunk.chunk_type)

    def _build_empty_summary(self, document: DocumentRecord, extraction: ExtractionResult) -> Summary:
        warnings = extraction.metadata.get("warnings") or []
        bullets = [
            "No strong metric anomalies were scored from the extracted content.",
            "Chunk count: {count}; metric count: {metrics}.".format(
                count=extraction.chunk_count,
                metrics=extraction.metric_count,
            ),
        ]
        if warnings:
            bullets.append(warnings[0])

        return Summary(
            document_id=document.id,
            headline="No high-confidence anomalies detected",
            bullets=bullets[:3],
            recommended_actions=SUMMARY_FALLBACK_ACTIONS[:],
            generated_with="rule_based",
        )

    def _get_openai_client(self) -> OpenAI:
        if self._openai_client is None:
            self._openai_client = OpenAI(api_key=self.settings.openai_api_key)
        return self._openai_client

    def _get_embeddings(self) -> OpenAIEmbeddings:
        if self._embeddings is None:
            self._embeddings = OpenAIEmbeddings(
                api_key=self.settings.openai_api_key,
                model=self.settings.openai_embedding_model,
                timeout=self.settings.openai_timeout_seconds,
            )
        return self._embeddings


explanation_service = ExplanationService()
