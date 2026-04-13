from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x0: float
    y0: float
    x1: float
    y1: float


class DocumentRecord(BaseModel):
    id: str
    file_name: str
    file_type: str
    created_at: datetime
    storage_path: str
    file_size: int
    status: str = "uploaded"
    warnings: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Chunk(BaseModel):
    id: str
    document_id: str
    page_number: int
    chunk_type: str
    text: str
    bbox: Optional[BoundingBox] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Metric(BaseModel):
    id: str
    document_id: str
    name: str
    value: float
    unit: Optional[str] = None
    period: Optional[str] = None
    context_chunk_id: str
    raw_text: str
    evidence_ids: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ExtractionResult(BaseModel):
    document_id: str
    file_name: str
    file_type: str
    chunk_count: int
    metric_count: int
    table_count: int
    chunks: List[Chunk] = Field(default_factory=list)
    metrics: List[Metric] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ScoreBreakdown(BaseModel):
    change_score: float
    severity_score: float
    evidence_score: float
    keyword_score: float
    uncertainty_penalty: float
    final_score: float


class Finding(BaseModel):
    id: str
    document_id: str
    title: str
    severity_score: float
    confidence_score: float
    final_score: float
    explanation: str = ""
    why_it_matters: str = ""
    next_action: str = ""
    evidence_ids: List[str] = Field(default_factory=list)
    metric_ids: List[str] = Field(default_factory=list)
    score_breakdown: ScoreBreakdown
    uncertainty_label: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AnalysisResult(BaseModel):
    document_id: str
    findings: List[Finding] = Field(default_factory=list)
    scoring_formula: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Summary(BaseModel):
    document_id: str
    headline: str
    bullets: List[str] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    generated_with: str = "rule_based"


class DocumentResult(BaseModel):
    document: DocumentRecord
    extraction: Optional[ExtractionResult] = None
    analysis: Optional[AnalysisResult] = None
    summary: Optional[Summary] = None


class UploadResponse(BaseModel):
    document: DocumentRecord


class DocumentRequest(BaseModel):
    document_id: str


class CypherQueryRequest(BaseModel):
    cypher: str
    params: Dict[str, Any] = Field(default_factory=dict)


class CypherQueryResponse(BaseModel):
    query: str
    records: List[Dict[str, Any]] = Field(default_factory=list)
    row_count: int = 0
    source: str
    warning: Optional[str] = None


class GraphNode(BaseModel):
    id: str
    label: str
    node_type: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    source: str
    target: str
    label: str


class GraphPayload(BaseModel):
    document_id: str
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
