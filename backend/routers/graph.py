from fastapi import APIRouter

from models.schemas import CypherQueryRequest, CypherQueryResponse, GraphPayload
from services.graph_service import graph_service


router = APIRouter(tags=["graph"])


@router.get("/graph/{document_id}", response_model=GraphPayload)
async def get_graph(document_id: str):
    return graph_service.build_graph(document_id)


@router.post("/graph/{document_id}/sync")
async def sync_graph(document_id: str):
    return graph_service.sync_graph(document_id)


@router.get("/graph/{document_id}/findings", response_model=CypherQueryResponse)
async def graph_findings(document_id: str):
    return graph_service.query_document_findings(document_id)


@router.post("/graph/query", response_model=CypherQueryResponse)
async def graph_query(payload: CypherQueryRequest):
    return graph_service.query_graph(payload.cypher, payload.params)
