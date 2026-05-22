import {
  type BackendBoundingBox,
  type BackendComparisonSummary,
  type BackendDocumentResult,
  type BackendFinding,
  type BackendGraphPayload,
  type BackendGraphNode,
  type BackendUploadResponse,
  type BackendVerificationSummary,
} from "@/lib/backend-types"
import { getResultById } from "@/lib/demo-data"
import {
  type EvidenceItem,
  type Finding,
  type GraphData,
  type GraphNodeType,
  type ResultResponse,
  type Severity,
  type VerificationCheck,
} from "@/lib/types"

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000"

function normalizeApiBaseUrl(value?: string) {
  if (!value) {
    return DEFAULT_API_BASE_URL
  }

  return value.replace("0.0.0.0", "127.0.0.1").replace(/\/$/, "")
}

export function getApiBaseUrl() {
  return normalizeApiBaseUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL
  )
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? ""
    const detail = await response.text()

    if (path === "/upload" && response.status === 405) {
      throw new Error(
        `POST /upload returned 405 from ${getApiBaseUrl()}. SignalLens is likely pointed at a different app on that port. Check NEXT_PUBLIC_API_BASE_URL and make sure the FastAPI backend for this repo is running.`
      )
    }

    if (contentType.includes("text/html")) {
      throw new Error(
        `Expected the SignalLens API at ${getApiBaseUrl()}${path}, but received HTML instead. NEXT_PUBLIC_API_BASE_URL is likely pointing to the wrong local server.`
      )
    }

    throw new Error(detail || `Request failed for ${path}`)
  }

  return response.json() as Promise<T>
}

export async function uploadDocument(file: File) {
  const formData = new FormData()
  formData.append("file", file)

  return requestJson<BackendUploadResponse>("/upload", {
    method: "POST",
    body: formData,
  })
}

async function runDocumentAction<T>(path: string, documentId: string) {
  return requestJson<T>(path, {
    method: "POST",
    body: JSON.stringify({ document_id: documentId }),
  })
}

export async function extractDocument(documentId: string) {
  return runDocumentAction("/extract", documentId)
}

export async function analyzeDocument(documentId: string) {
  return runDocumentAction("/analyze", documentId)
}

export async function explainDocument(documentId: string) {
  return runDocumentAction<BackendDocumentResult>("/explain", documentId)
}

export async function getBackendDocumentResult(documentId: string) {
  return requestJson<BackendDocumentResult>(`/result/${documentId}`)
}

export async function getBackendGraph(documentId: string) {
  return requestJson<BackendGraphPayload>(`/graph/${documentId}`)
}

export async function syncBackendGraph(documentId: string) {
  return requestJson<{ synced: boolean }>(`/graph/${documentId}/sync`, {
    method: "POST",
  })
}

export async function runDocumentPipeline(
  file: File,
  onProgress?: (stepIndex: number, documentId: string) => void
) {
  const upload = await uploadDocument(file)
  const documentId = upload.document.id

  onProgress?.(0, documentId)
  await extractDocument(documentId)

  onProgress?.(1, documentId)
  await analyzeDocument(documentId)

  onProgress?.(2, documentId)
  try {
    await syncBackendGraph(documentId)
  } catch {
    // Graph sync is optional for the demo because Neo4j may not be configured.
  }

  try {
    await getBackendGraph(documentId)
  } catch {
    // The graph endpoint is optional for the demo; results can still render from /result.
  }

  onProgress?.(3, documentId)
  const result = await explainDocument(documentId)

  onProgress?.(4, documentId)
  return { documentId, result }
}

function toSeverity(value: number): Severity {
  if (value >= 7) {
    return "high"
  }

  if (value >= 4) {
    return "medium"
  }

  return "low"
}

function toDocumentType(fileType: string) {
  const normalized = fileType.toLowerCase()

  if (normalized === "pdf") {
    return "PDF document"
  }

  if (
    normalized === "image" ||
    normalized === "png" ||
    normalized === "jpg" ||
    normalized === "jpeg"
  ) {
    return "Image document"
  }

  return fileType.toUpperCase()
}

function toSourceType(chunkType: string): EvidenceItem["sourceType"] {
  if (chunkType === "table") {
    return "table"
  }

  if (chunkType === "text") {
    return "text"
  }

  return "image"
}

function toSourceLabel(
  chunkType: string,
  metadata: Record<string, unknown>
): string {
  const source = typeof metadata.source === "string" ? metadata.source : ""

  if (chunkType === "table" || source === "pdf_table") {
    return "Table"
  }

  if (chunkType === "text" || source === "pdf_text") {
    return "PDF text"
  }

  if (
    chunkType === "ocr" ||
    source === "tesseract" ||
    source === "openai_vision"
  ) {
    return "OCR"
  }

  return "Image"
}

function toGraphNodeType(nodeType: string): GraphNodeType {
  const normalized = nodeType.toLowerCase()

  const lookup: Record<string, GraphNodeType> = {
    document: "Document",
    company: "Company",
    chunk: "Chunk",
    finding: "Finding",
    metric: "Metric",
    period: "Period",
    counterparty: "Counterparty",
    transaction: "Transaction",
    riskflag: "RiskFlag",
    risk_flag: "RiskFlag",
    section: "Section",
  }

  return lookup[normalized] ?? "Section"
}

function toMetricDelta(finding: BackendFinding) {
  const changePercent = finding.metadata?.change_percent
  const currentValue = finding.metadata?.current_value
  const currentUnit = finding.metadata?.current_unit
  const period = finding.metadata?.period

  if (typeof changePercent === "number" && Math.abs(changePercent) <= 500) {
    const sign = changePercent > 0 ? "+" : ""
    return `${sign}${changePercent.toFixed(1)}%`
  }

  if (typeof currentValue === "number") {
    const roundedValue =
      Math.abs(currentValue) >= 1000
        ? currentValue.toLocaleString("en-US", {
            maximumFractionDigits: 0,
          })
        : currentValue.toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })

    return `${currentUnit === "%" ? "" : ""}${roundedValue}${currentUnit ?? ""}${
      period ? ` · ${period}` : ""
    }`
  }

  if (typeof period === "string" && period.length > 0) {
    return period
  }

  return undefined
}

function toGraphMetadata(
  metadata: Record<string, unknown>
): Record<string, string | number | boolean> {
  const normalized: Record<string, string | number | boolean> = {}

  for (const [key, value] of Object.entries(metadata)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      normalized[key] = value
    }
  }

  return normalized
}

function buildFallbackGraph(result: BackendDocumentResult): BackendGraphPayload {
  const nodes = new Map<string, BackendGraphNode>()
  const edges = new Map<string, { source: string; target: string; label: string }>()

  const addNode = (node: BackendGraphNode) => {
    if (!nodes.has(node.id)) {
      nodes.set(node.id, node)
    }
  }

  const addEdge = (source: string, target: string, label: string) => {
    const id = `${source}-${target}-${label}`

    if (!edges.has(id)) {
      edges.set(id, { source, target, label })
    }
  }

  addNode({
    id: result.document.id,
    label: result.document.file_name,
    node_type: "document",
    metadata: {
      status: result.document.status,
      file_type: result.document.file_type,
    },
  })

  for (const chunk of result.extraction?.chunks ?? []) {
    addNode({
      id: chunk.id,
      label: `Page ${chunk.page_number} ${chunk.chunk_type}`,
      node_type: "chunk",
      metadata: {
        page: chunk.page_number,
        source: typeof chunk.metadata?.source === "string" ? chunk.metadata.source : chunk.chunk_type,
      },
    })
    addEdge(result.document.id, chunk.id, "APPEARS_IN")
  }

  for (const metric of result.extraction?.metrics ?? []) {
    addNode({
      id: metric.id,
      label: metric.name,
      node_type: "metric",
      metadata: {
        value: metric.value,
        ...(metric.unit ? { unit: metric.unit } : {}),
        ...(metric.period ? { period: metric.period } : {}),
        ...toGraphMetadata(metric.metadata),
      },
    })

    addEdge(result.document.id, metric.id, "MENTIONS")
    addEdge(metric.id, metric.context_chunk_id, "REPORTED_IN")
  }

  for (const finding of result.analysis?.findings ?? []) {
    addNode({
      id: finding.id,
      label: finding.title,
      node_type: "finding",
      metadata: {
        severity_score: finding.severity_score,
        confidence_score: finding.confidence_score,
        final_score: finding.final_score,
      },
    })

    addEdge(result.document.id, finding.id, "FLAGGED_AS")

    for (const metricId of finding.metric_ids) {
      addEdge(finding.id, metricId, "RELATED_TO")
    }

    for (const evidenceId of finding.evidence_ids) {
      addEdge(finding.id, evidenceId, "SUPPORTED_BY")
    }
  }

  return {
    document_id: result.document.id,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
  }
}

function buildEvidenceMap(
  result: BackendDocumentResult
): { evidence: EvidenceItem[]; chunkLookup: Map<string, EvidenceItem> } {
  const chunkLookup = new Map<string, EvidenceItem>()
  const chunks = result.extraction?.chunks ?? []

  const evidence = chunks.map((chunk) => {
    const sourceLabel = toSourceLabel(chunk.chunk_type, chunk.metadata ?? {})
    const item: EvidenceItem = {
      id: chunk.id,
      sourceType: toSourceType(chunk.chunk_type),
      title: `Page ${chunk.page_number} ${chunk.chunk_type}`,
      content: chunk.text,
      page: chunk.page_number,
      sourceLabel,
      previewUrl: `${getApiBaseUrl()}/result/${result.document.id}/pages/${chunk.page_number}/preview`,
      bbox: (chunk.bbox as BackendBoundingBox | null | undefined) ?? undefined,
      pageWidth:
        typeof chunk.metadata?.page_width === "number"
          ? chunk.metadata.page_width
          : undefined,
      pageHeight:
        typeof chunk.metadata?.page_height === "number"
          ? chunk.metadata.page_height
          : undefined,
      section: sourceLabel,
    }

    chunkLookup.set(chunk.id, item)
    return item
  })

  return { evidence, chunkLookup }
}

function mapFindings(
  result: BackendDocumentResult,
  chunkLookup: Map<string, EvidenceItem>
): Finding[] {
  const findings = result.analysis?.findings ?? []

  return findings.map((finding) => {
    const firstEvidence = finding.evidence_ids
      .map((evidenceId) => chunkLookup.get(evidenceId))
      .find(Boolean)

    return {
      id: finding.id,
      title: finding.title,
      category: finding.metric_ids.length > 0 ? "metric" : "narrative",
      severity: toSeverity(finding.severity_score),
      confidence: finding.confidence_score,
      explanation:
        finding.explanation ||
        finding.title ||
        "A backend-generated anomaly was detected.",
      impact: finding.why_it_matters || undefined,
      metricDelta: toMetricDelta(finding),
      section: firstEvidence?.page ? `Page ${firstEvidence.page}` : undefined,
      recommendation: finding.next_action || undefined,
      evidenceIds: finding.evidence_ids,
      relatedNodeIds: [
        finding.id,
        ...finding.metric_ids,
        ...finding.evidence_ids,
      ],
      metadata: finding.metadata,
      scoreBreakdown: {
        changeScore: finding.score_breakdown.change_score,
        severityScore: finding.score_breakdown.severity_score,
        evidenceScore: finding.score_breakdown.evidence_score,
        keywordScore: finding.score_breakdown.keyword_score,
        uncertaintyPenalty: finding.score_breakdown.uncertainty_penalty,
        finalScore: finding.score_breakdown.final_score,
      },
    }
  })
}

function mapGraph(graph: BackendGraphPayload): GraphData {
  const seenNodeIds = new Set<string>()
  const nodes = graph.nodes.filter((node: BackendGraphNode) => {
    if (seenNodeIds.has(node.id)) {
      return false
    }
    seenNodeIds.add(node.id)
    return true
  })

  const seenEdgeKeys = new Set<string>()
  const edges = graph.edges.filter((edge) => {
    const edgeKey = `${edge.source}::${edge.target}::${edge.label}`
    if (seenEdgeKeys.has(edgeKey)) {
      return false
    }
    seenEdgeKeys.add(edgeKey)
    return true
  })

  return {
    nodes: nodes.map((node: BackendGraphNode) => ({
      id: node.id,
      label: node.label,
      type: toGraphNodeType(node.node_type),
      metadata: node.metadata as Record<string, string | number | boolean>,
    })),
    edges: edges.map((edge, index) => ({
      id: `${edge.source}-${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
    })),
  }
}

function mapComparison(
  comparison: BackendComparisonSummary | null | undefined
): ResultResponse["comparison"] {
  if (!comparison) {
    return {
      mode: "none",
      headline: "No comparison is available yet.",
      summary: "SignalLens needs a comparable prior period to build a change view.",
      changes: [],
    }
  }

  return {
    mode:
      comparison.mode === "document_periods" ||
      comparison.mode === "baseline_document"
        ? comparison.mode
        : "none",
    headline: comparison.headline,
    summary: comparison.summary,
    baselineLabel: comparison.baseline_label ?? undefined,
    changes: comparison.changes.map((change) => ({
      id: change.id,
      label: change.label,
      status:
        change.status === "worsening" ||
        change.status === "improving" ||
        change.status === "stable"
          ? change.status
          : "stable",
      direction:
        change.direction === "up" ||
        change.direction === "down" ||
        change.direction === "flat"
          ? change.direction
          : "flat",
      currentValueLabel: change.current_value_label,
      previousValueLabel: change.previous_value_label ?? undefined,
      changePercentLabel: change.change_percent_label ?? undefined,
      periodLabel:
        change.period_current && change.period_previous
          ? `${change.period_previous} -> ${change.period_current}`
          : change.period_current ?? change.period_previous ?? undefined,
      evidenceIds: change.evidence_ids,
    })),
  }
}

function mapVerification(
  verification: BackendVerificationSummary | null | undefined
): ResultResponse["verification"] {
  if (!verification) {
    return {
      profileLabel: "Unclassified financial document",
      headline: "No official verification is available yet.",
      checks: [],
    }
  }

  return {
    profileLabel: verification.profile_label,
    headline: verification.headline,
    checks: verification.checks.map((check): VerificationCheck => ({
      id: check.id,
      title: check.title,
      status:
        check.status === "verified" ||
        check.status === "mismatch" ||
        check.status === "document-only" ||
        check.status === "unavailable"
          ? check.status
          : "unavailable",
      sourceName: check.source_name,
      sourceUrl: check.source_url ?? undefined,
      summary: check.summary,
      documentValueLabel: check.document_value_label ?? undefined,
      officialValueLabel: check.official_value_label ?? undefined,
      evidenceIds: check.evidence_ids,
    })),
  }
}

export function transformBackendResult(
  result: BackendDocumentResult,
  graph: BackendGraphPayload
): ResultResponse {
  const { evidence, chunkLookup } = buildEvidenceMap(result)
  const findings = mapFindings(result, chunkLookup)
  const confidenceScore =
    findings.length > 0
      ? Math.round(
          (findings.reduce((sum, finding) => sum + finding.confidence, 0) /
            findings.length) *
            100
        )
      : 0

  return {
    id: result.document.id,
    filename: result.document.file_name,
    documentType: toDocumentType(result.document.file_type),
    lastUpdated: new Date(result.document.created_at).toLocaleDateString(
      "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    ),
    scoreFormula:
      result.analysis?.scoring_formula ??
      "final_score = change_score + severity_score + evidence_score + keyword_score - uncertainty_penalty",
    summary: {
      title: `${result.document.file_name} analysis`,
      headline:
        result.summary?.headline ??
        findings[0]?.title ??
        "SignalLens completed the backend analysis pipeline.",
      overview: result.summary?.bullets?.[0]
        ? result.summary.bullets.join(" ")
        : `Processed ${result.extraction?.metric_count ?? 0} metrics across ${
            result.extraction?.chunk_count ?? 0
          } extracted chunks.`,
      keyTakeaways:
        result.summary?.bullets?.slice(0, 3) ??
        findings.slice(0, 3).map((finding) => finding.title),
    },
    stats: {
      totalFindings: findings.length,
      highRiskCount: findings.filter((finding) => finding.severity === "high")
        .length,
      entityCount: graph.nodes.length,
      relationshipCount: graph.edges.length,
      confidenceScore,
    },
    findings,
    evidence,
    graph: mapGraph(graph),
    comparison: mapComparison(result.comparison),
    verification: mapVerification(result.verification),
  }
}

export async function getIntegratedResult(documentId: string) {
  const result = await getBackendDocumentResult(documentId)

  let graph: BackendGraphPayload

  try {
    graph = await getBackendGraph(documentId)
  } catch {
    graph = buildFallbackGraph(result)
  }

  return transformBackendResult(result, graph)
}

export async function getIntegratedResultWithFallback(documentId: string) {
  try {
    return await getIntegratedResult(documentId)
  } catch {
    return getResultById(documentId) ?? null
  }
}

export async function fetchSampleFileAsFile(
  fileUrl: string,
  fileName: string,
  fileType: string
) {
  const response = await fetch(fileUrl)

  if (!response.ok) {
    throw new Error("Failed to load the sample file.")
  }

  const blob = await response.blob()
  return new File([blob], fileName, { type: fileType })
}
