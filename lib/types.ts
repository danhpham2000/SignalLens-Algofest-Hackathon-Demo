export type Severity = "low" | "medium" | "high"

export type FileStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "success"
  | "error"

export type SupportedFileType = "pdf" | "png" | "jpeg" | "jpg"

export type EvidenceSourceType = "text" | "table" | "image"

export type FindingCategory = "metric" | "counterparty" | "narrative" | "trend"

export type GraphNodeType =
  | "Document"
  | "Company"
  | "Chunk"
  | "Finding"
  | "Metric"
  | "Period"
  | "Counterparty"
  | "Transaction"
  | "RiskFlag"
  | "Section"

export interface UploadResponse {
  id: string
  filename: string
  status: FileStatus
}

export interface ProcessingStep {
  id: string
  label: string
  description: string
}

export interface EvidenceItem {
  id: string
  sourceType: EvidenceSourceType
  title: string
  content: string
  page?: number
  section?: string
}

export interface ScoreBreakdown {
  changeScore: number
  severityScore: number
  evidenceScore: number
  graphRiskScore?: number
  keywordScore?: number
  uncertaintyPenalty: number
  finalScore: number
}

export interface Finding {
  id: string
  title: string
  category: FindingCategory
  severity: Severity
  confidence: number
  explanation: string
  impact?: string
  metricDelta?: string
  section?: string
  recommendation?: string
  evidenceIds: string[]
  relatedNodeIds: string[]
  scoreBreakdown: ScoreBreakdown
}

export interface GraphNode {
  id: string
  label: string
  type: GraphNodeType
  value?: string | number
  metadata?: Record<string, string | number | boolean>
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface SummaryStats {
  totalFindings: number
  highRiskCount: number
  entityCount: number
  relationshipCount: number
  confidenceScore: number
}

export interface ResultSummary {
  title: string
  headline: string
  overview: string
  keyTakeaways: string[]
}

export interface ResultResponse {
  id: string
  filename: string
  documentType: string
  lastUpdated: string
  scoreFormula: string
  summary: ResultSummary
  stats: SummaryStats
  findings: Finding[]
  evidence: EvidenceItem[]
  graph: GraphData
}

export interface SampleFile {
  id: string
  name: string
  filename: string
  fileType: SupportedFileType
  focus: string
  resultId: string
  viewHref?: string
  viewLabel?: string
  sourceHref?: string
}

export interface DemoSampleResponse {
  resultId: string
  sample: SampleFile
}
