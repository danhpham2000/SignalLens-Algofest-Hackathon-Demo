from typing import Any, Dict, Optional
import re

from neo4j import GraphDatabase
from neo4j.graph import Node, Path, Relationship

from core.config import get_settings
from models.schemas import CypherQueryResponse
from models.schemas import DocumentResult


class Neo4jRepository:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._driver = None

    def enabled(self) -> bool:
        return self.settings.neo4j_enabled

    def connection_status(self) -> Dict[str, Any]:
        status = {
            "enabled": self.enabled(),
            "uri_present": bool(self.settings.neo4j_uri),
            "uri_source": self.settings.neo4j_uri_source,
        }
        if not self.enabled():
            status["connected"] = False
            status["warning"] = "NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD are required."
            return status

        try:
            driver = self._get_driver()
            with driver.session() as session:
                record = session.run("RETURN 1 AS ok").single()
            status["connected"] = bool(record and record.get("ok") == 1)
        except Exception as exc:
            status["connected"] = False
            status["warning"] = str(exc)
        return status

    def sync_document_result(self, result: DocumentResult) -> bool:
        if not self.enabled() or not result.analysis:
            return False

        try:
            driver = self._get_driver()
            with driver.session() as session:
                session.execute_write(self._write_result, result.model_dump(mode="json"))
            return True
        except Exception:
            return False

    def run_read_query(self, cypher: str, params: Optional[Dict[str, Any]] = None) -> CypherQueryResponse:
        if not self.enabled():
            return CypherQueryResponse(
                query=cypher,
                records=[],
                row_count=0,
                source="neo4j",
                warning="Neo4j is not fully configured.",
            )

        normalized = re.sub(r"\s+", " ", cypher).strip().lower()
        forbidden_tokens = [
            " create ",
            " merge ",
            " delete ",
            " detach ",
            " set ",
            " remove ",
            " drop ",
            " foreach ",
            " load csv ",
            " call dbms",
        ]
        padded = " {query} ".format(query=normalized)
        if any(token in padded for token in forbidden_tokens):
            return CypherQueryResponse(
                query=cypher,
                records=[],
                row_count=0,
                source="neo4j",
                warning="Only read-only Cypher queries are allowed.",
            )

        try:
            with self._get_driver().session() as session:
                result = session.run(cypher, params or {})
                records = [self._serialize_record(record.data()) for record in result]
            return CypherQueryResponse(
                query=cypher,
                records=records,
                row_count=len(records),
                source="neo4j",
            )
        except Exception as exc:
            return CypherQueryResponse(
                query=cypher,
                records=[],
                row_count=0,
                source="neo4j",
                warning=str(exc),
            )

    def fetch_document_findings(self, document_id: str) -> CypherQueryResponse:
        return self.run_read_query(
            """
            MATCH (d:Document {id: $document_id})-[:HAS_FINDING]->(f:Finding)
            OPTIONAL MATCH (f)-[:USES_METRIC]->(m:Metric)
            OPTIONAL MATCH (f)-[:SUPPORTED_BY]->(c:Chunk)
            RETURN
                f.id AS finding_id,
                f.title AS title,
                f.final_score AS final_score,
                f.severity_score AS severity_score,
                f.confidence_score AS confidence_score,
                collect(DISTINCT m.name)[0..5] AS metrics,
                collect(DISTINCT {
                    chunk_id: c.id,
                    page_number: c.page_number,
                    chunk_type: c.chunk_type
                })[0..5] AS evidence
            ORDER BY final_score DESC
            """,
            {"document_id": document_id},
        )

    def _get_driver(self):
        if self._driver is None:
            self._driver = GraphDatabase.driver(
                self.settings.neo4j_uri,
                auth=(self.settings.neo4j_user, self.settings.neo4j_password),
                connection_timeout=self.settings.neo4j_timeout_seconds,
                max_transaction_retry_time=1.0,
            )
        return self._driver

    def _serialize_record(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return {key: self._serialize_value(value) for key, value in payload.items()}

    def _serialize_value(self, value: Any) -> Any:
        if isinstance(value, Node):
            return {
                "id": value.get("id"),
                "labels": list(value.labels),
                "properties": dict(value.items()),
            }
        if isinstance(value, Relationship):
            return {
                "type": value.type,
                "properties": dict(value.items()),
            }
        if isinstance(value, Path):
            return {
                "nodes": [self._serialize_value(node) for node in value.nodes],
                "relationships": [self._serialize_value(rel) for rel in value.relationships],
            }
        if isinstance(value, list):
            return [self._serialize_value(item) for item in value]
        if isinstance(value, dict):
            return {key: self._serialize_value(item) for key, item in value.items()}
        return value

    @staticmethod
    def _write_result(tx, payload: Dict[str, Any]) -> None:
        document = payload["document"]
        tx.run(
            """
            MERGE (d:Document {id: $document_id})
            SET d.file_name = $file_name,
                d.file_type = $file_type,
                d.created_at = $created_at,
                d.status = $status
            """,
            document_id=document["id"],
            file_name=document["file_name"],
            file_type=document["file_type"],
            created_at=document["created_at"],
            status=document["status"],
        )

        extraction = payload.get("extraction") or {}
        for chunk in extraction.get("chunks", []):
            tx.run(
                """
                MATCH (d:Document {id: $document_id})
                MERGE (c:Chunk {id: $chunk_id})
                SET c.page_number = $page_number,
                    c.chunk_type = $chunk_type,
                    c.text = $text
                MERGE (d)-[:HAS_CHUNK]->(c)
                """,
                document_id=document["id"],
                chunk_id=chunk["id"],
                page_number=chunk["page_number"],
                chunk_type=chunk["chunk_type"],
                text=chunk["text"][:2000],
            )

        for metric in extraction.get("metrics", []):
            tx.run(
                """
                MATCH (d:Document {id: $document_id})
                MERGE (m:Metric {id: $metric_id})
                SET m.name = $name,
                    m.value = $value,
                    m.unit = $unit,
                    m.period = $period
                MERGE (d)-[:HAS_METRIC]->(m)
                """,
                document_id=document["id"],
                metric_id=metric["id"],
                name=metric["name"],
                value=metric["value"],
                unit=metric.get("unit"),
                period=metric.get("period"),
            )

        analysis = payload.get("analysis") or {}
        for finding in analysis.get("findings", []):
            tx.run(
                """
                MATCH (d:Document {id: $document_id})
                MERGE (f:Finding {id: $finding_id})
                SET f.title = $title,
                    f.severity_score = $severity_score,
                    f.confidence_score = $confidence_score,
                    f.final_score = $final_score
                MERGE (d)-[:HAS_FINDING]->(f)
                """,
                document_id=document["id"],
                finding_id=finding["id"],
                title=finding["title"],
                severity_score=finding["severity_score"],
                confidence_score=finding["confidence_score"],
                final_score=finding["final_score"],
            )

            for metric_id in finding.get("metric_ids", []):
                tx.run(
                    """
                    MATCH (f:Finding {id: $finding_id})
                    MATCH (m:Metric {id: $metric_id})
                    MERGE (f)-[:USES_METRIC]->(m)
                    """,
                    finding_id=finding["id"],
                    metric_id=metric_id,
                )

            for chunk_id in finding.get("evidence_ids", []):
                tx.run(
                    """
                    MATCH (f:Finding {id: $finding_id})
                    MATCH (c:Chunk {id: $chunk_id})
                    MERGE (f)-[:SUPPORTED_BY]->(c)
                    """,
                    finding_id=finding["id"],
                    chunk_id=chunk_id,
                )


neo4j_repository = Neo4jRepository()
