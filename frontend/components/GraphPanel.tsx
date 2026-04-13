"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Link2, Network } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FadeIn, easeOutExpo } from "@/components/ui/motion"
import {
  type GraphData,
  type GraphEdge,
  type GraphNode,
  type GraphNodeType,
} from "@/lib/types"

type GraphPanelProps = {
  graph: GraphData
  activeNodeIds: string[]
  findingTitle: string
}

type PositionedNode = GraphNode & {
  x: number
  y: number
}

const typeOrder: GraphNodeType[] = [
  "Document",
  "Company",
  "Finding",
  "Chunk",
  "Section",
  "Metric",
  "Period",
  "Counterparty",
  "Transaction",
  "RiskFlag",
]

const nodeConfig: Record<
  GraphNodeType,
  { gradFrom: string; gradTo: string; textColor: string; icon: string }
> = {
  Document:     { gradFrom: "#38bdf8", gradTo: "#0284c7", textColor: "#fff", icon: "D" },
  Company:      { gradFrom: "#fbbf24", gradTo: "#d97706", textColor: "#fff", icon: "CO" },
  Chunk:        { gradFrom: "#94a3b8", gradTo: "#475569", textColor: "#fff", icon: "Ch" },
  Finding:      { gradFrom: "#34d399", gradTo: "#059669", textColor: "#fff", icon: "!" },
  Section:      { gradFrom: "#fb923c", gradTo: "#ea580c", textColor: "#fff", icon: "S" },
  Metric:       { gradFrom: "#818cf8", gradTo: "#4f46e5", textColor: "#fff", icon: "M" },
  Period:       { gradFrom: "#c084fc", gradTo: "#9333ea", textColor: "#fff", icon: "P" },
  Counterparty: { gradFrom: "#f87171", gradTo: "#dc2626", textColor: "#fff", icon: "CT" },
  Transaction:  { gradFrom: "#fde68a", gradTo: "#f59e0b", textColor: "#1e293b", icon: "T" },
  RiskFlag:     { gradFrom: "#fb7185", gradTo: "#e11d48", textColor: "#fff", icon: "RF" },
}

const legendTypes: GraphNodeType[] = [
  "Document",
  "Finding",
  "Metric",
  "Chunk",
  "RiskFlag",
  "Counterparty",
]

const GRAPH_W = 900
const GRAPH_H = 440
const NODE_R = 26
const NODE_R_SELECTED = 32
const TOP_PAD = 64
const BOTTOM_PAD = 56

function truncateLabel(label: string) {
  return label.length > 15 ? `${label.slice(0, 14)}…` : label
}

function getPositions(nodes: GraphNode[]): PositionedNode[] {
  const presentTypes = typeOrder.filter((type) =>
    nodes.some((n) => n.type === type)
  )
  const colCount = presentTypes.length
  const colGap =
    colCount > 1 ? (GRAPH_W - 120) / (colCount - 1) : 0
  const startX = colCount === 1 ? GRAPH_W / 2 : 60

  const groups = new Map<GraphNodeType, GraphNode[]>()
  presentTypes.forEach((type) => groups.set(type, []))
  nodes.forEach((node) => groups.get(node.type)?.push(node))

  const usableH = GRAPH_H - TOP_PAD - BOTTOM_PAD

  return nodes.map((node) => {
    const colIndex = presentTypes.indexOf(node.type)
    const siblings = groups.get(node.type) ?? []
    const nodeIndex = siblings.findIndex((s) => s.id === node.id)
    const step = siblings.length > 1 ? usableH / (siblings.length - 1) : 0

    return {
      ...node,
      x: startX + colIndex * colGap,
      y:
        siblings.length > 1
          ? TOP_PAD + nodeIndex * step
          : GRAPH_H / 2,
    }
  })
}

function getConnectedEdges(edges: GraphEdge[], nodeId: string) {
  return edges.filter(
    (e) => e.source === nodeId || e.target === nodeId
  )
}

function getEdgePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r = NODE_R
): string {
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) return ""

  const ux = dx / dist
  const uy = dy / dist
  const sx = x1 + ux * (r + 3)
  const sy = y1 + uy * (r + 3)
  const ex = x2 - ux * (r + 14)
  const ey = y2 - uy * (r + 14)

  const ex2 = ex - sx
  const ey2 = ey - sy
  const cx1 = sx + ex2 * 0.35
  const cy1 = sy + ey2 * 0.05
  const cx2 = ex - ex2 * 0.35
  const cy2 = ey - ey2 * 0.05

  return `M ${sx} ${sy} C ${cx1} ${cy1} ${cx2} ${cy2} ${ex} ${ey}`
}

function getMid(x1: number, y1: number, x2: number, y2: number) {
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 10 }
}

export default function GraphPanel({
  graph,
  activeNodeIds,
  findingTitle,
}: GraphPanelProps) {
  const activeNodeSet = new Set(activeNodeIds)
  const positionedNodes = getPositions(graph.nodes)
  const posMap = new Map(positionedNodes.map((n) => [n.id, n] as const))

  const [selectedNodeId, setSelectedNodeId] = React.useState<string>(
    activeNodeIds[0] ?? graph.nodes[0]?.id ?? ""
  )

  React.useEffect(() => {
    if (activeNodeIds.length > 0) {
      setSelectedNodeId(activeNodeIds[0])
      return
    }
    if (graph.nodes.length > 0) setSelectedNodeId(graph.nodes[0].id)
  }, [activeNodeIds, graph.nodes])

  const selectedNode =
    graph.nodes.find((n) => n.id === selectedNodeId) ?? graph.nodes[0]
  const selectedEdges = selectedNode
    ? getConnectedEdges(graph.edges, selectedNode.id)
    : []

  const presentLegend = legendTypes.filter((t) =>
    graph.nodes.some((n) => n.type === t)
  )

  return (
    <FadeIn>
      <Card
        id="graph-panel"
        className="panel-surface gap-4 border-0 bg-transparent py-0 shadow-none ring-0"
      >
        <CardHeader className="gap-3 px-0 pt-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium tracking-[0.22em] text-primary uppercase">
                Graph panel
              </p>
              <CardTitle className="font-heading text-2xl font-semibold">
                Connected financial facts
              </CardTitle>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Badge variant="outline" className="rounded-full">
                <Network className="h-3.5 w-3.5" />
                {activeNodeIds.length} highlighted nodes
              </Badge>
            </motion.div>
          </div>
          <p className="text-sm/6 text-muted-foreground">
            {findingTitle} is mapped against sections, metrics, periods,
            counterparties, and risk flags so the anomaly remains explainable.
          </p>
        </CardHeader>

        <CardContent className="space-y-5 px-0">
          {/* Graph canvas */}
          <div className="overflow-hidden rounded-[1.5rem] border border-border/75 bg-background/70 p-3">
            <div className="data-grid rounded-[1.2rem] bg-background/80">
              <svg
                viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
                className="h-[420px] w-full"
                role="img"
                aria-label="SignalLens relationship graph"
              >
                <defs>
                  {/* Per-type gradients */}
                  {(
                    Object.entries(nodeConfig) as [
                      GraphNodeType,
                      (typeof nodeConfig)[GraphNodeType],
                    ][]
                  ).map(([type, cfg]) => (
                    <React.Fragment key={type}>
                      <linearGradient
                        id={`grad-${type}`}
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor={cfg.gradFrom} />
                        <stop offset="100%" stopColor={cfg.gradTo} />
                      </linearGradient>
                      <linearGradient
                        id={`grad-${type}-soft`}
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          stopColor={cfg.gradFrom}
                          stopOpacity="0.25"
                        />
                        <stop
                          offset="100%"
                          stopColor={cfg.gradTo}
                          stopOpacity="0.1"
                        />
                      </linearGradient>
                    </React.Fragment>
                  ))}

                  {/* Drop shadow */}
                  <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow
                      dx="0"
                      dy="3"
                      stdDeviation="5"
                      floodColor="#000"
                      floodOpacity="0.2"
                    />
                  </filter>

                  {/* Selected glow */}
                  <filter
                    id="glow-sel"
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feGaussianBlur
                      in="SourceAlpha"
                      stdDeviation="7"
                      result="blur"
                    />
                    <feFlood
                      floodColor="#38bdf8"
                      floodOpacity="0.55"
                      result="color"
                    />
                    <feComposite
                      in="color"
                      in2="blur"
                      operator="in"
                      result="glow"
                    />
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Active glow */}
                  <filter
                    id="glow-act"
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feGaussianBlur
                      in="SourceAlpha"
                      stdDeviation="4"
                      result="blur"
                    />
                    <feFlood
                      floodColor="#34d399"
                      floodOpacity="0.4"
                      result="color"
                    />
                    <feComposite
                      in="color"
                      in2="blur"
                      operator="in"
                      result="glow"
                    />
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Arrow markers */}
                  <marker
                    id="arr-dim"
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#cbd5e1" />
                  </marker>
                  <marker
                    id="arr-act"
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
                  </marker>
                  <marker
                    id="arr-sel"
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#0ea5e9" />
                  </marker>

                  {/* Subtle grid pattern */}
                  <pattern
                    id="grid"
                    width="44"
                    height="44"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 44 0 L 0 0 0 44"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="0.4"
                      strokeOpacity="0.18"
                    />
                  </pattern>
                </defs>

                {/* Background */}
                <rect
                  width={GRAPH_W}
                  height={GRAPH_H}
                  fill="url(#grid)"
                  rx="12"
                />

                {/* ── Edges ── */}
                {graph.edges.map((edge, idx) => {
                  const src = posMap.get(edge.source)
                  const tgt = posMap.get(edge.target)
                  if (!src || !tgt) return null

                  const isSel =
                    edge.source === selectedNode?.id ||
                    edge.target === selectedNode?.id
                  const isAct =
                    activeNodeSet.has(edge.source) ||
                    activeNodeSet.has(edge.target)

                  const path = getEdgePath(src.x, src.y, tgt.x, tgt.y)
                  if (!path) return null

                  const mid = getMid(src.x, src.y, tgt.x, tgt.y)
                  const stroke = isSel ? "#0ea5e9" : isAct ? "#64748b" : "#cbd5e1"
                  const sw = isSel ? 2.2 : isAct ? 1.6 : 1
                  const marker = isSel ? "arr-sel" : isAct ? "arr-act" : "arr-dim"
                  const labelLen = edge.label.length
                  const labelW = labelLen * 6.2 + 10

                  return (
                    <g key={edge.id}>
                      <motion.path
                        d={path}
                        stroke={stroke}
                        strokeWidth={sw}
                        fill="none"
                        strokeLinecap="round"
                        markerEnd={`url(#${marker})`}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                          pathLength: 1,
                          opacity: isSel ? 1 : isAct ? 0.85 : 0.55,
                        }}
                        transition={{
                          duration: 0.5,
                          delay: idx * 0.02,
                          ease: easeOutExpo,
                        }}
                      />

                      {/* Edge label — only on selected edge */}
                      {isSel && (
                        <motion.g
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2, delay: 0.25 }}
                        >
                          <rect
                            x={mid.x - labelW / 2}
                            y={mid.y - 10}
                            width={labelW}
                            height={17}
                            rx={8.5}
                            fill="#f0f9ff"
                            stroke="#bae6fd"
                            strokeWidth={1}
                          />
                          <text
                            x={mid.x}
                            y={mid.y + 2}
                            textAnchor="middle"
                            fontSize={8.5}
                            fontFamily="'SF Mono', 'Fira Code', monospace"
                            fontWeight="600"
                            fill="#0369a1"
                          >
                            {edge.label.toUpperCase()}
                          </text>
                        </motion.g>
                      )}
                    </g>
                  )
                })}

                {/* ── Nodes ── */}
                {positionedNodes.map((node, idx) => {
                  const cfg = nodeConfig[node.type]
                  const isAct = activeNodeSet.has(node.id)
                  const isSel = node.id === selectedNode?.id
                  const r = isSel ? NODE_R_SELECTED : NODE_R
                  const label = truncateLabel(node.label)
                  const labelW = label.length * 7 + 14

                  return (
                    <motion.g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      className="cursor-pointer"
                      onClick={() => setSelectedNodeId(node.id)}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.38,
                        delay: 0.08 + idx * 0.045,
                        ease: easeOutExpo,
                      }}
                      whileHover={{ scale: 1.09 }}
                    >
                      {/* Active pulsing ring */}
                      {isAct && !isSel && (
                        <motion.circle
                          r={r + 11}
                          fill={`url(#grad-${node.type}-soft)`}
                          stroke={cfg.gradFrom}
                          strokeWidth={1.4}
                          strokeDasharray="3 5"
                          animate={{
                            opacity: [0.35, 0.8, 0.35],
                            scale: [0.95, 1.06, 0.95],
                          }}
                          transition={{
                            duration: 2.2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}

                      {/* Selected outer halo */}
                      {isSel && (
                        <motion.circle
                          r={r + 14}
                          fill="none"
                          stroke={cfg.gradFrom}
                          strokeWidth={2}
                          strokeOpacity={0.35}
                          animate={{
                            scale: [1, 1.12, 1],
                            opacity: [0.5, 0.15, 0.5],
                          }}
                          transition={{
                            duration: 1.8,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}

                      {/* Main filled circle */}
                      <circle
                        r={r}
                        fill={`url(#grad-${node.type})`}
                        filter={
                          isSel
                            ? "url(#glow-sel)"
                            : isAct
                              ? "url(#glow-act)"
                              : "url(#shadow)"
                        }
                        stroke="rgba(255,255,255,0.30)"
                        strokeWidth={isSel ? 2.5 : 1.5}
                      />

                      {/* Inner highlight */}
                      <ellipse
                        cx={0}
                        cy={-r * 0.28}
                        rx={r * 0.48}
                        ry={r * 0.26}
                        fill="rgba(255,255,255,0.22)"
                      />

                      {/* Type icon */}
                      <motion.text
                        y={cfg.icon.length > 1 ? 4 : 5}
                        textAnchor="middle"
                        fill={cfg.textColor}
                        fontSize={cfg.icon.length > 1 ? 10 : 13}
                        fontWeight="700"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.18 + idx * 0.04 }}
                      >
                        {cfg.icon}
                      </motion.text>

                      {/* Label pill */}
                      <motion.g
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.22 + idx * 0.04 }}
                      >
                        <rect
                          x={-labelW / 2}
                          y={r + 5}
                          width={labelW}
                          height={18}
                          rx={9}
                          fill={
                            isSel ? cfg.gradTo : "rgba(15, 23, 42, 0.75)"
                          }
                        />
                        <text
                          y={r + 18}
                          textAnchor="middle"
                          fill="#f1f5f9"
                          fontSize={10}
                          fontWeight={isSel ? "600" : "500"}
                          fontFamily="system-ui, -apple-system, sans-serif"
                        >
                          {label}
                        </text>
                      </motion.g>
                    </motion.g>
                  )
                })}
              </svg>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2">
            {presentLegend.map((type, idx) => {
              const cfg = nodeConfig[type]
              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                >
                  <Badge
                    variant="outline"
                    className="gap-1.5 rounded-full border-transparent"
                    style={{
                      backgroundColor: cfg.gradFrom + "1f",
                      color: cfg.gradTo,
                    }}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${cfg.gradFrom}, ${cfg.gradTo})`,
                      }}
                    />
                    {type}
                  </Badge>
                </motion.div>
              )
            })}
          </div>

          {/* Selected node detail */}
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22 }}
                className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]"
              >
                {/* Node info */}
                <div className="rounded-[1.4rem] border border-border/75 bg-background/70 p-5">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${nodeConfig[selectedNode.type].gradFrom}, ${nodeConfig[selectedNode.type].gradTo})`,
                        color: nodeConfig[selectedNode.type].textColor,
                      }}
                    >
                      {nodeConfig[selectedNode.type].icon}
                    </span>
                    <p className="text-sm font-medium text-muted-foreground">
                      Selected node
                    </p>
                  </div>
                  <p className="mt-2 font-heading text-xl font-semibold">
                    {selectedNode.label}
                  </p>
                  <Badge
                    variant="secondary"
                    className="mt-3 rounded-full"
                    style={{
                      background:
                        nodeConfig[selectedNode.type].gradFrom + "22",
                      color: nodeConfig[selectedNode.type].gradTo,
                    }}
                  >
                    {selectedNode.type}
                  </Badge>

                  {selectedNode.metadata &&
                  Object.keys(selectedNode.metadata).length > 0 ? (
                    <div className="mt-4 grid gap-2">
                      {Object.entries(selectedNode.metadata).map(
                        ([key, value], i) => (
                          <motion.div
                            key={key}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.04 }}
                            className="rounded-2xl bg-secondary/70 px-3 py-2 text-sm"
                          >
                            <span className="font-medium capitalize">
                              {key.replaceAll("_", " ")}:
                            </span>{" "}
                            {String(value)}
                          </motion.div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">
                      No extra metadata attached.
                    </p>
                  )}
                </div>

                {/* Relationships */}
                <div className="rounded-[1.4rem] border border-border/75 bg-background/70 p-5">
                  <p className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Link2 className="h-4 w-4" />
                    Connected relationships
                  </p>
                  <div className="mt-4 space-y-3">
                    {selectedEdges.length > 0 ? (
                      selectedEdges.map((edge, i) => {
                        const otherId =
                          edge.source === selectedNode.id
                            ? edge.target
                            : edge.source
                        const otherNode = graph.nodes.find(
                          (n) => n.id === otherId
                        )
                        const otherCfg = otherNode
                          ? nodeConfig[otherNode.type]
                          : null

                        return (
                          <motion.div
                            key={edge.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.04 }}
                            className="rounded-2xl bg-secondary/70 px-4 py-3"
                          >
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[8.5px] font-mono font-semibold tracking-wider text-primary uppercase">
                              {edge.label}
                            </span>
                            <p className="mt-1.5 font-medium">
                              {selectedNode.label}{" "}
                              <span className="text-muted-foreground">→</span>{" "}
                              {otherNode ? (
                                <span
                                  className="cursor-pointer underline underline-offset-2"
                                  style={{ color: otherCfg?.gradTo }}
                                  onClick={() =>
                                    setSelectedNodeId(otherNode.id)
                                  }
                                >
                                  {otherNode.label}
                                </span>
                              ) : (
                                otherId
                              )}
                            </p>
                          </motion.div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No connected relationships for this node.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </CardContent>
      </Card>
    </FadeIn>
  )
}
