"use client"

import { type GraphData, type GraphNode, type GraphNodeType } from "@/lib/types"

type SimpleGraphPreviewProps = {
  graph: GraphData
  activeFindingId: string
  findingTitle: string
  relatedNodeIds: string[]
}

type PreviewNode = GraphNode & {
  x: number
  y: number
  edgeLabel: string
  edgeDirection: "incoming" | "outgoing"
  side: "left" | "right"
  anchorY: number
}

const VIEWBOX_W = 960
const VIEWBOX_H = 520
const CENTER_X = VIEWBOX_W / 2
const CENTER_Y = VIEWBOX_H / 2
const CENTER_W = 228
const CENTER_H = 96
const NODE_W = 164
const NODE_H = 64
const MAX_VISIBLE_NODES = 6
const COLUMN_PADDING = 72

const typePriority: GraphNodeType[] = [
  "Document",
  "Metric",
  "Chunk",
  "Section",
  "Company",
  "Period",
  "Counterparty",
  "Transaction",
  "RiskFlag",
  "Finding",
]

const nodeStyles: Record<GraphNodeType, { fill: string; stroke: string }> = {
  Document: { fill: "#e0f2fe", stroke: "#38bdf8" },
  Company: { fill: "#fef3c7", stroke: "#f59e0b" },
  Chunk: { fill: "#e2e8f0", stroke: "#64748b" },
  Finding: { fill: "#dbeafe", stroke: "#3b82f6" },
  Metric: { fill: "#dcfce7", stroke: "#16a34a" },
  Period: { fill: "#fce7f3", stroke: "#ec4899" },
  Counterparty: { fill: "#fee2e2", stroke: "#ef4444" },
  Transaction: { fill: "#ffedd5", stroke: "#f97316" },
  RiskFlag: { fill: "#fee2e2", stroke: "#dc2626" },
  Section: { fill: "#ede9fe", stroke: "#8b5cf6" },
}

function truncateLabel(label: string, maxLength: number) {
  if (label.length <= maxLength) {
    return label
  }

  return `${label.slice(0, maxLength).trimEnd()}…`
}

function formatEdgeLabel(label: string) {
  return label.replaceAll("_", " ").toLowerCase()
}

function getColumnX(side: PreviewNode["side"]) {
  if (side === "left") {
    return COLUMN_PADDING
  }

  return VIEWBOX_W - COLUMN_PADDING - NODE_W
}

function getColumnYs(count: number) {
  if (count <= 1) {
    return [CENTER_Y - NODE_H / 2]
  }

  const top = 56
  const bottom = VIEWBOX_H - 56 - NODE_H
  const step = (bottom - top) / (count - 1)

  return Array.from({ length: count }, (_, index) => top + step * index)
}

function getAnchorYs(count: number) {
  if (count <= 1) {
    return [CENTER_Y]
  }

  const top = CENTER_Y - CENTER_H / 2 + 18
  const bottom = CENTER_Y + CENTER_H / 2 - 18
  const step = (bottom - top) / (count - 1)

  return Array.from({ length: count }, (_, index) => top + step * index)
}

function getNodeRank(type: GraphNodeType) {
  const index = typePriority.indexOf(type)
  return index === -1 ? typePriority.length : index
}

function getEdgeInfo(graph: GraphData, activeFindingId: string, nodeId: string) {
  const directEdge = graph.edges.find(
    (edge) =>
      (edge.source === activeFindingId && edge.target === nodeId) ||
      (edge.target === activeFindingId && edge.source === nodeId)
  )

  if (!directEdge) {
    return {
      label: "related",
      direction: "outgoing" as const,
    }
  }

  return {
    label: formatEdgeLabel(directEdge.label),
    direction:
      directEdge.source === activeFindingId ? ("outgoing" as const) : ("incoming" as const),
  }
}

function positionColumn(
  nodes: GraphNode[],
  side: PreviewNode["side"],
  graph: GraphData,
  activeFindingId: string
): PreviewNode[] {
  const x = getColumnX(side)
  const ys = getColumnYs(nodes.length)
  const anchorYs = getAnchorYs(nodes.length)

  return nodes.map((node, index) => {
    const edgeInfo = getEdgeInfo(graph, activeFindingId, node.id)

    return {
      ...node,
      x,
      y: ys[index] ?? CENTER_Y - NODE_H / 2,
      side,
      anchorY: anchorYs[index] ?? CENTER_Y,
      edgeLabel: edgeInfo.label,
      edgeDirection: edgeInfo.direction,
    }
  })
}

function getPreviewNodes(
  graph: GraphData,
  activeFindingId: string,
  relatedNodeIds: string[]
): PreviewNode[] {
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node] as const))
  const edgeNodeIds = graph.edges
    .filter(
      (edge) => edge.source === activeFindingId || edge.target === activeFindingId
    )
    .map((edge) => (edge.source === activeFindingId ? edge.target : edge.source))

  const candidateIds = [...edgeNodeIds, ...relatedNodeIds].filter(
    (nodeId) => nodeId !== activeFindingId
  )

  const uniqueNodes = Array.from(new Set(candidateIds))
    .map((nodeId) => nodeMap.get(nodeId))
    .filter((node): node is GraphNode => Boolean(node))
    .sort((left, right) => {
      const rankDiff = getNodeRank(left.type) - getNodeRank(right.type)

      if (rankDiff !== 0) {
        return rankDiff
      }

      return left.label.localeCompare(right.label)
    })

  const visibleNodes = uniqueNodes.slice(0, MAX_VISIBLE_NODES)
  const leftCount = Math.ceil(visibleNodes.length / 2)
  const leftNodes = visibleNodes.slice(0, leftCount)
  const rightNodes = visibleNodes.slice(leftCount)

  return [
    ...positionColumn(leftNodes, "left", graph, activeFindingId),
    ...positionColumn(rightNodes, "right", graph, activeFindingId),
  ]
}

function getCenterNode(
  graph: GraphData,
  activeFindingId: string,
  findingTitle: string
): GraphNode {
  return (
    graph.nodes.find((node) => node.id === activeFindingId) ?? {
      id: activeFindingId,
      label: findingTitle,
      type: "Finding",
    }
  )
}

export default function SimpleGraphPreview({
  graph,
  activeFindingId,
  findingTitle,
  relatedNodeIds,
}: SimpleGraphPreviewProps) {
  const centerNode = getCenterNode(graph, activeFindingId, findingTitle)
  const previewNodes = getPreviewNodes(graph, activeFindingId, relatedNodeIds)

  return (
    <div className="rounded-[1.6rem] border border-border/80 bg-background/65 p-4 sm:p-5">
      <div className="overflow-hidden rounded-[1.3rem] border border-border/70 bg-white/60">
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          className="h-110 w-full bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_42%),linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-size-[auto,36px_36px,36px_36px]"
          role="img"
          aria-label={`Simple graph preview for ${findingTitle}`}
        >
          <defs>
            <marker
              id="arrow-outgoing"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" fillOpacity="0.72" />
            </marker>
            <marker
              id="arrow-incoming"
              viewBox="0 0 10 10"
              refX="2"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 10 0 L 0 5 L 10 10 z" fill="#64748b" fillOpacity="0.72" />
            </marker>
          </defs>

          {previewNodes.map((node) => {
            const style = nodeStyles[node.type] ?? nodeStyles.Section
            const isLeft = node.side === "left"
            const lineStartX = isLeft ? CENTER_X - CENTER_W / 2 : CENTER_X + CENTER_W / 2
            const lineStartY = node.anchorY
            const lineEndX = isLeft ? node.x + NODE_W : node.x
            const lineEndY = node.y + NODE_H / 2
            const controlX = isLeft ? CENTER_X - 190 : CENTER_X + 190
            const controlY = lineStartY + (lineEndY - lineStartY) * 0.36
            const labelText = truncateLabel(
              node.edgeDirection === "outgoing"
                ? `${node.edgeLabel} ->`
                : `<- ${node.edgeLabel}`,
              18
            )
            const labelWidth = Math.max(78, labelText.length * 7 + 18)
            const labelX = isLeft ? CENTER_X - 175 : CENTER_X + 175
            const labelY = lineStartY + (lineEndY - lineStartY) * 0.52
            const nodeTextX = node.x + NODE_W / 2

            return (
              <g key={node.id}>
                <path
                  d={`M ${lineStartX} ${lineStartY} Q ${controlX} ${controlY} ${lineEndX} ${lineEndY}`}
                  stroke={style.stroke}
                  strokeWidth="2"
                  strokeOpacity="0.4"
                  fill="none"
                  markerStart={
                    node.edgeDirection === "incoming" ? "url(#arrow-incoming)" : undefined
                  }
                  markerEnd={
                    node.edgeDirection === "outgoing" ? "url(#arrow-outgoing)" : undefined
                  }
                />
                <rect
                  x={labelX - labelWidth / 2}
                  y={labelY - 11}
                  width={labelWidth}
                  height={22}
                  rx={11}
                  fill="rgba(255,255,255,0.94)"
                  stroke="rgba(148,163,184,0.35)"
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="#475569"
                >
                  {labelText}
                </text>
                <rect
                  x={node.x}
                  y={node.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx="16"
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth="1.5"
                />
                <text
                  x={nodeTextX}
                  y={node.y + 22}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#64748b"
                >
                  {node.type}
                </text>
                <text
                  x={nodeTextX}
                  y={node.y + 36}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="600"
                  fill="#0f172a"
                >
                  {truncateLabel(node.label, 18)}
                </text>
              </g>
            )
          })}

          <g>
            <rect
              x={CENTER_X - CENTER_W / 2}
              y={CENTER_Y - CENTER_H / 2}
              width={CENTER_W}
              height={CENTER_H}
              rx="20"
              fill={nodeStyles.Finding.fill}
              stroke={nodeStyles.Finding.stroke}
              strokeWidth="2"
            />
            <text
              x={CENTER_X}
              y={CENTER_Y - 10}
              textAnchor="middle"
              fontSize="11"
              fill="#1d4ed8"
            >
              Selected finding
            </text>
            <text
              x={CENTER_X}
              y={CENTER_Y + 10}
              textAnchor="middle"
              fontSize="15"
              fontWeight="700"
              fill="#0f172a"
            >
              {truncateLabel(centerNode.label, 24)}
            </text>
          </g>
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
          {previewNodes.length + 1} visible nodes
        </span>
        <span className="rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
          Focused on the selected finding
        </span>
      </div>
    </div>
  )
}
