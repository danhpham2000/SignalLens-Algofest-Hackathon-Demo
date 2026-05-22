"use client"

import * as React from "react"
import cytoscape, {
  type Core,
  type EdgeSingular,
  type ElementDefinition,
} from "cytoscape"
import { AnimatePresence, motion } from "framer-motion"
import {
  Link2,
  LocateFixed,
  Maximize2,
  Network,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FadeIn } from "@/components/ui/motion"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
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

const legendTypes: GraphNodeType[] = [
  "Document",
  "Finding",
  "Metric",
  "Chunk",
  "Section",
  "Counterparty",
  "RiskFlag",
]

const nodeConfig: Record<
  GraphNodeType,
  {
    fill: string
    border: string
    text: string
    shape:
      | "ellipse"
      | "round-rectangle"
      | "diamond"
      | "hexagon"
      | "tag"
      | "rectangle"
  }
> = {
  Document: {
    fill: "#0f766e",
    border: "#14b8a6",
    text: "#f0fdfa",
    shape: "round-rectangle",
  },
  Company: {
    fill: "#b45309",
    border: "#f59e0b",
    text: "#fffbeb",
    shape: "ellipse",
  },
  Chunk: {
    fill: "#475569",
    border: "#94a3b8",
    text: "#f8fafc",
    shape: "round-rectangle",
  },
  Finding: {
    fill: "#0f766e",
    border: "#34d399",
    text: "#ecfdf5",
    shape: "hexagon",
  },
  Metric: {
    fill: "#3730a3",
    border: "#818cf8",
    text: "#eef2ff",
    shape: "ellipse",
  },
  Period: {
    fill: "#7c3aed",
    border: "#c084fc",
    text: "#faf5ff",
    shape: "tag",
  },
  Counterparty: {
    fill: "#b91c1c",
    border: "#f87171",
    text: "#fef2f2",
    shape: "diamond",
  },
  Transaction: {
    fill: "#c2410c",
    border: "#fb923c",
    text: "#fff7ed",
    shape: "diamond",
  },
  RiskFlag: {
    fill: "#be123c",
    border: "#fb7185",
    text: "#fff1f2",
    shape: "hexagon",
  },
  Section: {
    fill: "#4338ca",
    border: "#a78bfa",
    text: "#f5f3ff",
    shape: "round-rectangle",
  },
}

function formatMetadataKey(key: string) {
  return key.replaceAll("_", " ")
}

function formatEdgeLabel(label: string) {
  return label.replaceAll("_", " ").toLowerCase()
}

function getConnectedEdges(edges: GraphEdge[], nodeId: string) {
  return edges.filter((edge) => edge.source === nodeId || edge.target === nodeId)
}

function buildElements(graph: GraphData): ElementDefinition[] {
  return [
    ...graph.nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.label,
        type: node.type,
      },
    })),
    ...graph.edges.map((edge) => ({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: formatEdgeLabel(edge.label),
      },
    })),
  ]
}

function buildStylesheet() {
  const styles: any[] = [
    {
      selector: "node",
      style: {
        label: "data(label)",
        width: 54,
        height: 54,
        color: "#f8fafc",
        "font-size": 10,
        "font-weight": 650,
        "text-wrap": "wrap",
        "text-max-width": "112px",
        "text-valign": "center",
        "text-halign": "center",
        "text-outline-color": "#0f172a",
        "text-outline-width": 3,
        "border-width": 2,
        "border-color": "#cbd5e1",
        "overlay-opacity": 0,
        "shadow-blur": 0,
        "shadow-opacity": 0,
        opacity: 1,
        "transition-property":
          "background-color border-color border-width opacity width height shadow-opacity shadow-blur",
        "transition-duration": 220,
      },
    },
    {
      selector: "edge",
      style: {
        width: 1.7,
        opacity: 0.5,
        label: "data(label)",
        color: "#475569",
        "font-size": 8,
        "text-opacity": 0,
        "text-rotation": "autorotate",
        "text-background-color": "#f8fafc",
        "text-background-opacity": 0,
        "text-background-padding": "3px",
        "text-background-shape": "roundrectangle",
        "text-margin-y": "-8px",
        "curve-style": "bezier",
        "line-color": "#94a3b8",
        "target-arrow-color": "#94a3b8",
        "target-arrow-shape": "triangle",
        "arrow-scale": 1,
        "transition-property":
          "line-color target-arrow-color width opacity text-opacity text-background-opacity",
        "transition-duration": 220,
      },
    },
    {
      selector: "node.is-active",
      style: {
        "border-width": 3,
        "shadow-color": "#67e8f9",
        "shadow-opacity": 0.28,
        "shadow-blur": 16,
      },
    },
    {
      selector: "node.is-neighbor",
      style: {
        "shadow-color": "#22d3ee",
        "shadow-opacity": 0.18,
        "shadow-blur": 12,
      },
    },
    {
      selector: "node.is-selected",
      style: {
        width: 68,
        height: 68,
        "border-width": 4,
        "border-color": "#e0f2fe",
        "shadow-color": "#0ea5e9",
        "shadow-opacity": 0.48,
        "shadow-blur": 26,
      },
    },
    {
      selector: "node.is-muted",
      style: {
        opacity: 0.16,
        "text-opacity": 0.18,
      },
    },
    {
      selector: "edge.is-neighbor",
      style: {
        width: 2.8,
        opacity: 0.98,
        "line-color": "#0f766e",
        "target-arrow-color": "#0f766e",
        "text-opacity": 1,
        "text-background-opacity": 0.92,
      },
    },
    {
      selector: "edge.is-selected",
      style: {
        width: 3.2,
        opacity: 1,
        "line-color": "#0284c7",
        "target-arrow-color": "#0284c7",
        "text-opacity": 1,
        "text-background-opacity": 0.96,
      },
    },
    {
      selector: "edge.is-muted",
      style: {
        opacity: 0.08,
        "text-opacity": 0,
      },
    },
  ]

  for (const [type, config] of Object.entries(nodeConfig) as [
    GraphNodeType,
    (typeof nodeConfig)[GraphNodeType],
  ][]) {
    styles.push({
      selector: `node[type = "${type}"]`,
      style: {
        shape: config.shape,
        "background-color": config.fill,
        "border-color": config.border,
        color: config.text,
      },
    })
  }

  return styles as unknown as cytoscape.StylesheetJson
}

function syncGraphState(
  cy: Core,
  activeNodeIds: string[],
  selectedNodeId: string,
  focusMode: "finding" | "all"
) {
  const activeSet = new Set(activeNodeIds)

  cy.nodes().removeClass("is-active is-neighbor is-selected is-muted")
  cy.edges().removeClass("is-neighbor is-selected is-muted")

  cy.nodes().forEach((node) => {
    if (activeSet.has(node.id())) {
      node.addClass("is-active")
    }
  })

  const selectedNode = selectedNodeId ? cy.getElementById(selectedNodeId) : null
  if (selectedNode && !selectedNode.empty()) {
    selectedNode.addClass("is-selected")
    const neighborhood = selectedNode.closedNeighborhood()
    neighborhood.nodes().addClass("is-neighbor")
    neighborhood.edges().addClass("is-neighbor")

    neighborhood.edges().forEach((edge) => {
      if (
        edge.source().id() === selectedNode.id() ||
        edge.target().id() === selectedNode.id()
      ) {
        edge.addClass("is-selected")
      }
    })
  }

  if (focusMode === "finding") {
    cy.nodes().forEach((node) => {
      if (
        !activeSet.has(node.id()) &&
        !node.hasClass("is-selected") &&
        !node.hasClass("is-neighbor")
      ) {
        node.addClass("is-muted")
      }
    })

    cy.edges().forEach((edge: EdgeSingular) => {
      const sourceId = edge.source().id()
      const targetId = edge.target().id()

      if (
        !activeSet.has(sourceId) &&
        !activeSet.has(targetId) &&
        !edge.hasClass("is-neighbor")
      ) {
        edge.addClass("is-muted")
      }
    })
  }
}

export default function GraphPanel({
  graph,
  activeNodeIds,
  findingTitle,
}: GraphPanelProps) {
  const relationshipsPerPage = 5
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const cyRef = React.useRef<Core | null>(null)
  const [selectedNodeId, setSelectedNodeId] = React.useState(
    activeNodeIds[0] ?? graph.nodes[0]?.id ?? ""
  )
  const [focusMode, setFocusMode] = React.useState<"finding" | "all">("finding")
  const [relationshipsPage, setRelationshipsPage] = React.useState(1)

  React.useEffect(() => {
    if (activeNodeIds.length > 0) {
      setSelectedNodeId(activeNodeIds[0])
      return
    }

    if (graph.nodes.length > 0) {
      setSelectedNodeId(graph.nodes[0].id)
    }
  }, [activeNodeIds, graph.nodes])

  React.useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(graph),
      layout: {
        name: "cose",
        animate: false,
        fit: true,
        padding: 56,
        nodeRepulsion: 120000,
        idealEdgeLength: 160,
        edgeElasticity: 90,
        gravity: 0.2,
        numIter: 900,
      },
      style: buildStylesheet(),
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: false,
      minZoom: 0.45,
      maxZoom: 2.2,
      wheelSensitivity: 0.2,
    })

    cy.on("tap", "node", (event) => {
      setSelectedNodeId(event.target.id())
    })

    cyRef.current = cy
    syncGraphState(cy, activeNodeIds, selectedNodeId, focusMode)

    const resizeObserver = new ResizeObserver(() => {
      cy.resize()
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      cy.destroy()
      cyRef.current = null
    }
  }, [graph])

  React.useEffect(() => {
    const cy = cyRef.current
    if (!cy) {
      return
    }

    syncGraphState(cy, activeNodeIds, selectedNodeId, focusMode)
  }, [activeNodeIds, focusMode, selectedNodeId])

  const selectedNode =
    graph.nodes.find((node) => node.id === selectedNodeId) ?? graph.nodes[0]
  const selectedEdges = selectedNode
    ? getConnectedEdges(graph.edges, selectedNode.id)
    : []
  const totalRelationshipPages = Math.max(
    1,
    Math.ceil(selectedEdges.length / relationshipsPerPage)
  )
  const paginatedSelectedEdges = selectedEdges.slice(
    (relationshipsPage - 1) * relationshipsPerPage,
    relationshipsPage * relationshipsPerPage
  )
  const presentLegend = legendTypes.filter((type) =>
    graph.nodes.some((node) => node.type === type)
  )

  React.useEffect(() => {
    setRelationshipsPage(1)
  }, [selectedNodeId])

  React.useEffect(() => {
    if (relationshipsPage > totalRelationshipPages) {
      setRelationshipsPage(totalRelationshipPages)
    }
  }, [relationshipsPage, totalRelationshipPages])

  function runLayout(mode: "cose" | "breadthfirst") {
    const cy = cyRef.current
    if (!cy) {
      return
    }

    if (mode === "breadthfirst") {
      const rootId = selectedNodeId || activeNodeIds[0]
      const roots = rootId ? [rootId] : undefined

      cy.layout({
        name: "breadthfirst",
        animate: true,
        animationDuration: 350,
        fit: true,
        padding: 72,
        directed: true,
        spacingFactor: 1.15,
        roots,
      }).run()

      return
    }

    cy.layout({
      name: "cose",
      animate: true,
      animationDuration: 350,
      fit: true,
      padding: 56,
      nodeRepulsion: 120000,
      idealEdgeLength: 160,
      edgeElasticity: 90,
      gravity: 0.2,
      numIter: 900,
    }).run()
  }

  function fitGraph() {
    const cy = cyRef.current
    if (!cy) {
      return
    }

    cy.fit(cy.elements(), 70)
  }

  function focusSelection() {
    const cy = cyRef.current
    if (!cy) {
      return
    }

    const selected = selectedNodeId ? cy.getElementById(selectedNodeId) : null
    if (!selected || selected.empty()) {
      cy.fit(cy.elements(), 70)
      return
    }

    cy.animate({
      fit: {
        eles: selected.closedNeighborhood(),
        padding: 110,
      },
      duration: 320,
    })
  }

  function zoomGraph(multiplier: number) {
    const cy = cyRef.current
    if (!cy) {
      return
    }

    const nextZoom = Math.min(2.2, Math.max(0.45, cy.zoom() * multiplier))
    cy.zoom({
      level: nextZoom,
      renderedPosition: {
        x: cy.width() / 2,
        y: cy.height() / 2,
      },
    })
  }

  return (
    <FadeIn>
      <Card
        id="graph-panel"
        className="panel-surface gap-4 border-0 bg-transparent py-0 shadow-none ring-0"
      >
        <CardContent className="space-y-4 px-0 pt-0">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full">
              <Network className="h-3.5 w-3.5" />
              {graph.nodes.length} nodes
            </Badge>
            <Badge variant="outline" className="rounded-full">
              {graph.edges.length} edges
            </Badge>
            <Badge variant="outline" className="rounded-full">
              {focusMode === "finding" ? "Focused" : "Full graph"}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={focusMode === "finding" ? "default" : "outline"}
              className="rounded-full"
              onClick={() =>
                setFocusMode((current) =>
                  current === "finding" ? "all" : "finding"
                )
              }
            >
              <LocateFixed />
              {focusMode === "finding" ? "Focused view" : "Show focused view"}
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={focusSelection}
            >
              <Maximize2 />
              Focus selection
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={fitGraph}
            >
              Fit all
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => runLayout("breadthfirst")}
            >
              <LocateFixed />
              Finding layout
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => runLayout("cose")}
            >
              <RotateCcw />
              Re-layout
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => zoomGraph(1.18)}
              aria-label="Zoom in"
            >
              <ZoomIn />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => zoomGraph(0.85)}
              aria-label="Zoom out"
            >
              <ZoomOut />
            </Button>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-border/75 bg-background/70 p-3">
            <div className="rounded-[1.2rem] border border-border/60 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.08),transparent_35%),linear-gradient(to_right,rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.14)_1px,transparent_1px)] bg-size-[auto,34px_34px,34px_34px]">
              <div
                ref={containerRef}
                className="h-[32rem] w-full cursor-grab active:cursor-grabbing"
                aria-label="Interactive relationship graph"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {presentLegend.map((type) => (
              <Badge
                key={type}
                variant="outline"
                className="gap-1.5 rounded-full border-transparent"
                style={{
                  backgroundColor: `${nodeConfig[type].fill}1a`,
                  color: nodeConfig[type].border,
                }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: nodeConfig[type].border }}
                />
                {type}
              </Badge>
            ))}
          </div>

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
                <div className="rounded-[1.4rem] border border-border/75 bg-background/70 p-5">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: nodeConfig[selectedNode.type].fill,
                        border: `1px solid ${nodeConfig[selectedNode.type].border}`,
                      }}
                    />
                    <p className="text-sm font-medium text-muted-foreground">
                      Selected node
                    </p>
                  </div>
                  <p className="mt-2 font-medium">
                    {selectedNode.label}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge
                      variant="secondary"
                      className="rounded-full"
                      style={{
                        backgroundColor: `${nodeConfig[selectedNode.type].fill}1a`,
                        color: nodeConfig[selectedNode.type].border,
                      }}
                    >
                      {selectedNode.type}
                    </Badge>
                    <Badge variant="outline" className="rounded-full">
                      {selectedEdges.length} linked
                    </Badge>
                  </div>

                  {selectedNode.metadata &&
                  Object.keys(selectedNode.metadata).length > 0 ? (
                    <div className="mt-4 grid gap-2">
                      {Object.entries(selectedNode.metadata).map(([key, value]) => (
                        <div
                          key={key}
                          className="rounded-2xl bg-secondary/70 px-3 py-2 text-sm"
                        >
                          <span className="font-medium capitalize">
                            {formatMetadataKey(key)}:
                          </span>{" "}
                          {String(value)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">
                      No extra metadata is attached to this node in the current
                      payload.
                    </p>
                  )}
                </div>

                <div className="rounded-[1.4rem] border border-border/75 bg-background/70 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Link2 className="h-4 w-4" />
                      Connected relationships
                    </p>
                    {selectedEdges.length > relationshipsPerPage ? (
                      <Badge variant="outline" className="rounded-full">
                        Page {relationshipsPage} of {totalRelationshipPages}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-4 space-y-3">
                    {selectedEdges.length > 0 ? (
                      paginatedSelectedEdges.map((edge, index) => {
                        const otherId =
                          edge.source === selectedNode.id ? edge.target : edge.source
                        const otherNode = graph.nodes.find((node) => node.id === otherId)

                        return (
                          <motion.button
                            key={edge.id}
                            type="button"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18, delay: index * 0.03 }}
                            className="block w-full rounded-2xl bg-secondary/70 px-4 py-3 text-left transition hover:bg-secondary"
                            onClick={() => {
                              if (otherNode) {
                                setSelectedNodeId(otherNode.id)
                              }
                            }}
                          >
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[8.5px] font-mono font-semibold tracking-wider text-primary uppercase">
                              {formatEdgeLabel(edge.label)}
                            </span>
                            <p className="mt-1.5 font-medium">
                              {selectedNode.label}
                              <span className="mx-2 text-muted-foreground">→</span>
                              {otherNode?.label ?? otherId}
                            </p>
                          </motion.button>
                        )
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No connected relationships for this node.
                      </p>
                    )}
                  </div>

                  {totalRelationshipPages > 1 ? (
                    <Pagination className="mt-4 justify-start">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            text="Previous"
                            aria-disabled={relationshipsPage === 1}
                            className={
                              relationshipsPage === 1
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                            onClick={(event) => {
                              event.preventDefault()
                              setRelationshipsPage((page) => Math.max(1, page - 1))
                            }}
                          />
                        </PaginationItem>

                        {Array.from(
                          { length: totalRelationshipPages },
                          (_, index) => index + 1
                        ).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              isActive={page === relationshipsPage}
                              onClick={(event) => {
                                event.preventDefault()
                                setRelationshipsPage(page)
                              }}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            text="Next"
                            aria-disabled={
                              relationshipsPage === totalRelationshipPages
                            }
                            className={
                              relationshipsPage === totalRelationshipPages
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                            onClick={(event) => {
                              event.preventDefault()
                              setRelationshipsPage((page) =>
                                Math.min(totalRelationshipPages, page + 1)
                              )
                            }}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  ) : null}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </CardContent>
      </Card>
    </FadeIn>
  )
}
