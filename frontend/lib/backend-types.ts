export interface BackendDocumentRecord {
  id: string
  file_name: string
  file_type: string
  created_at: string
  storage_path: string
  file_size: number
  status: string
  warnings: string[]
  metadata: Record<string, unknown>
}

export interface BackendBoundingBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface BackendChunk {
  id: string
  document_id: string
  page_number: number
  chunk_type: string
  text: string
  bbox?: BackendBoundingBox | null
  metadata: Record<string, unknown>
}

export interface BackendMetric {
  id: string
  document_id: string
  name: string
  value: number
  unit?: string | null
  period?: string | null
  context_chunk_id: string
  raw_text: string
  evidence_ids: string[]
  metadata: Record<string, unknown>
}

export interface BackendExtractionResult {
  document_id: string
  file_name: string
  file_type: string
  chunk_count: number
  metric_count: number
  table_count: number
  chunks: BackendChunk[]
  metrics: BackendMetric[]
  metadata: Record<string, unknown>
}

export interface BackendScoreBreakdown {
  change_score: number
  severity_score: number
  evidence_score: number
  keyword_score: number
  uncertainty_penalty: number
  final_score: number
}

export interface BackendFinding {
  id: string
  document_id: string
  title: string
  severity_score: number
  confidence_score: number
  final_score: number
  explanation: string
  why_it_matters: string
  next_action: string
  evidence_ids: string[]
  metric_ids: string[]
  score_breakdown: BackendScoreBreakdown
  uncertainty_label?: string | null
  metadata: Record<string, unknown>
}

export interface BackendAnalysisResult {
  document_id: string
  findings: BackendFinding[]
  scoring_formula: string
  metadata: Record<string, unknown>
}

export interface BackendSummary {
  document_id: string
  headline: string
  bullets: string[]
  recommended_actions: string[]
  generated_with: string
}

export interface BackendComparisonChange {
  id: string
  label: string
  status: string
  direction: string
  current_value: number
  current_value_label: string
  previous_value?: number | null
  previous_value_label?: string | null
  unit?: string | null
  period_current?: string | null
  period_previous?: string | null
  change_percent?: number | null
  change_percent_label?: string | null
  evidence_ids: string[]
  metadata: Record<string, unknown>
}

export interface BackendComparisonSummary {
  mode: string
  headline: string
  summary: string
  baseline_label?: string | null
  changes: BackendComparisonChange[]
}

export interface BackendVerificationCheck {
  id: string
  title: string
  status: string
  source_name: string
  source_url?: string | null
  summary: string
  document_value_label?: string | null
  official_value_label?: string | null
  evidence_ids: string[]
  metadata: Record<string, unknown>
}

export interface BackendVerificationSummary {
  profile_label: string
  headline: string
  checks: BackendVerificationCheck[]
}

export interface BackendDocumentResult {
  document: BackendDocumentRecord
  extraction?: BackendExtractionResult | null
  analysis?: BackendAnalysisResult | null
  summary?: BackendSummary | null
  comparison?: BackendComparisonSummary | null
  verification?: BackendVerificationSummary | null
}

export interface BackendUploadResponse {
  document: BackendDocumentRecord
}

export interface BackendGraphNode {
  id: string
  label: string
  node_type: string
  metadata: Record<string, unknown>
}

export interface BackendGraphEdge {
  source: string
  target: string
  label: string
}

export interface BackendGraphPayload {
  document_id: string
  nodes: BackendGraphNode[]
  edges: BackendGraphEdge[]
}
