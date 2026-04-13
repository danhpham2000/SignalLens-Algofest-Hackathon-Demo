from typing import Dict, List

from db.neo4j_repo import neo4j_repository
from models.schemas import CypherQueryResponse, GraphEdge, GraphNode, GraphPayload
from services.storage_service import storage_service


class GraphService:
    def build_graph(self, document_id: str) -> GraphPayload:
        result = storage_service.build_result(document_id)
        nodes: List[GraphNode] = []
        edges: List[GraphEdge] = []
        node_ids = set()

        def add_node(node: GraphNode) -> None:
            if node.id in node_ids:
                return
            node_ids.add(node.id)
            nodes.append(node)

        add_node(
            GraphNode(
                id=result.document.id,
                label=result.document.file_name,
                node_type="document",
                metadata={"status": result.document.status},
            )
        )

        chunk_lookup: Dict[str, Dict[str, object]] = {}
        metric_lookup: Dict[str, Dict[str, object]] = {}

        if result.extraction:
            for chunk in result.extraction.chunks[:12]:
                chunk_lookup[chunk.id] = chunk.model_dump()
                add_node(
                    GraphNode(
                        id=chunk.id,
                        label="Page {page} {kind}".format(page=chunk.page_number, kind=chunk.chunk_type),
                        node_type="chunk",
                        metadata={"page_number": chunk.page_number, "chunk_type": chunk.chunk_type},
                    )
                )
                edges.append(GraphEdge(source=result.document.id, target=chunk.id, label="has_chunk"))

            for metric in result.extraction.metrics[:20]:
                metric_lookup[metric.id] = metric.model_dump()
                add_node(
                    GraphNode(
                        id=metric.id,
                        label=metric.name,
                        node_type="metric",
                        metadata={"value": metric.value, "unit": metric.unit, "period": metric.period},
                    )
                )
                edges.append(GraphEdge(source=result.document.id, target=metric.id, label="has_metric"))

        if result.analysis:
            for finding in result.analysis.findings:
                add_node(
                    GraphNode(
                        id=finding.id,
                        label=finding.title,
                        node_type="finding",
                        metadata={
                            "severity_score": finding.severity_score,
                            "confidence_score": finding.confidence_score,
                        },
                    )
                )
                edges.append(GraphEdge(source=result.document.id, target=finding.id, label="has_finding"))

                for metric_id in finding.metric_ids:
                    if metric_id in metric_lookup:
                        edges.append(GraphEdge(source=finding.id, target=metric_id, label="uses_metric"))

                for chunk_id in finding.evidence_ids:
                    if chunk_id in chunk_lookup:
                        edges.append(GraphEdge(source=finding.id, target=chunk_id, label="supported_by"))

        return GraphPayload(document_id=document_id, nodes=nodes, edges=edges)

    def sync_graph(self, document_id: str) -> Dict[str, object]:
        result = storage_service.build_result(document_id)
        synced = neo4j_repository.sync_document_result(result)
        return {
            "document_id": document_id,
            "neo4j_enabled": neo4j_repository.enabled(),
            "neo4j_status": neo4j_repository.connection_status(),
            "synced": synced,
        }

    def query_graph(self, cypher: str, params: Dict[str, object]) -> CypherQueryResponse:
        return neo4j_repository.run_read_query(cypher, params)

    def query_document_findings(self, document_id: str) -> CypherQueryResponse:
        return neo4j_repository.fetch_document_findings(document_id)


graph_service = GraphService()
