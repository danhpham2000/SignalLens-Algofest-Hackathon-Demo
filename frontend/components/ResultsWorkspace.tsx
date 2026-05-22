"use client"

import * as React from "react"
import { Clock3, FileStack } from "lucide-react"

import AskGraphPanel from "@/components/AskGraphPanel"
import ComparePanel from "@/components/ComparePanel"
import EmptyState from "@/components/EmptyState"
import ExportBriefButton from "@/components/ExportBriefButton"
import GraphPanel from "@/components/GraphPanel"
import Header from "@/components/Header"
import ProvenanceViewer from "@/components/ProvenanceViewer"
import VerificationPanel from "@/components/VerificationPanel"
import { Badge } from "@/components/ui/badge"
import { FadeIn } from "@/components/ui/motion"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type EvidenceItem, type ResultResponse } from "@/lib/types"

type ResultsWorkspaceProps = {
  result: ResultResponse
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength).trimEnd()}...`
}

function formatEvidenceMeta(item: EvidenceItem) {
  const meta: string[] = []

  if (item.sourceLabel) {
    meta.push(item.sourceLabel)
  }

  if (item.page) {
    meta.push(`Page ${item.page}`)
  }

  return meta.join(" · ")
}

export default function ResultsWorkspace({ result }: ResultsWorkspaceProps) {
  const findingsPerPage = 3
  const [activeFindingId, setActiveFindingId] = React.useState(
    result.findings[0]?.id ?? ""
  )
  const [activeTab, setActiveTab] = React.useState("findings")
  const [findingsPage, setFindingsPage] = React.useState(1)

  const activeFinding =
    result.findings.find((finding) => finding.id === activeFindingId) ??
    result.findings[0]

  const activeEvidence = result.evidence.filter((item) =>
    activeFinding?.evidenceIds.includes(item.id)
  )
  const primaryEvidence = activeEvidence[0]
  const activeGraphNodeIds = activeFinding
    ? Array.from(
        new Set([activeFinding.id, ...activeFinding.relatedNodeIds])
      )
    : []
  const totalFindingPages = Math.max(
    1,
    Math.ceil(result.findings.length / findingsPerPage)
  )
  const paginatedFindings = result.findings.slice(
    (findingsPage - 1) * findingsPerPage,
    findingsPage * findingsPerPage
  )

  React.useEffect(() => {
    if (!activeFindingId && result.findings[0]?.id) {
      setActiveFindingId(result.findings[0].id)
    }
  }, [activeFindingId, result.findings])

  React.useEffect(() => {
    const activeIndex = result.findings.findIndex(
      (finding) => finding.id === activeFindingId
    )

    if (activeIndex === -1) {
      return
    }

    const nextPage = Math.floor(activeIndex / findingsPerPage) + 1
    if (nextPage !== findingsPage) {
      setFindingsPage(nextPage)
    }
  }, [activeFindingId, findingsPage, result.findings])

  if (!activeFinding) {
    return (
      <>
        <Header
          eyebrow="Results"
          primaryAction={{ href: "/", label: "Analyze another file" }}
        />
        <div className="page-shell py-10">
          <EmptyState />
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        eyebrow="Results"
        primaryAction={{ href: "/", label: "Analyze another file" }}
      />

      <main className="page-shell space-y-5 py-8">
        <section>
          <FadeIn className="panel-surface rounded-[1.75rem] p-6 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  <FileStack className="h-3.5 w-3.5" />
                  {result.documentType}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {result.lastUpdated}
                </Badge>
                <Badge
                  variant="secondary"
                  className="rounded-full px-3 py-1 font-mono"
                >
                  {result.filename}
                </Badge>
              </div>
              <ExportBriefButton result={result} />
            </div>

            <h1 className="mt-5 max-w-4xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              {result.summary.headline}
            </h1>
            <p className="mt-3 max-w-3xl text-sm/6 text-muted-foreground">
              {truncateText(result.summary.overview, 220)}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.25rem] border border-border/80 bg-background/70 p-4">
                <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  Findings
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold">
                  {result.stats.totalFindings}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-border/80 bg-background/70 p-4">
                <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  High risk
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold">
                  {result.stats.highRiskCount}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-border/80 bg-background/70 p-4">
                <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  Confidence
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold">
                  {result.stats.confidenceScore}%
                </p>
              </div>
            </div>
          </FadeIn>
        </section>

        <section>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <FadeIn>
              <div className="rounded-[1.6rem] border border-border/80 bg-background/65 p-4">
                <TabsList className="grid w-full grid-cols-4 rounded-2xl bg-secondary/85 p-1">
                  <TabsTrigger value="findings" className="rounded-xl">
                    Findings
                  </TabsTrigger>
                  <TabsTrigger value="compare" className="rounded-xl">
                    Compare
                  </TabsTrigger>
                  <TabsTrigger value="trust" className="rounded-xl">
                    Trust
                  </TabsTrigger>
                  <TabsTrigger value="graph" className="rounded-xl">
                    Graph
                  </TabsTrigger>
                </TabsList>
              </div>
            </FadeIn>

            <TabsContent value="findings" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[0.84fr_1.16fr]">
                <FadeIn className="rounded-[1.6rem] border border-border/80 bg-background/65 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Signals</p>
                      <p className="text-sm text-muted-foreground">
                        Page {findingsPage} of {totalFindingPages}
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full">
                      {result.findings.length} total
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    {paginatedFindings.map((finding) => (
                      <button
                        key={finding.id}
                        type="button"
                        onClick={() => setActiveFindingId(finding.id)}
                        className={[
                          "block w-full rounded-[1.25rem] border p-4 text-left transition",
                          finding.id === activeFinding.id
                            ? "border-primary/30 bg-background/85"
                            : "border-border/80 bg-background/70 hover:border-primary/20",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <Badge
                            className={`rounded-full capitalize ${
                              finding.severity === "high"
                                ? "bg-red-500 text-white hover:bg-red-600"
                                : finding.severity === "medium"
                                  ? "bg-yellow-400 text-black hover:bg-yellow-500"
                                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            }`}
                          >
                            {finding.severity}
                          </Badge>
                          <span className="font-mono text-xs text-muted-foreground">
                            {(finding.confidence * 100).toFixed(0)}%
                          </span>
                        </div>

                        <p className="mt-3 font-medium">{finding.title}</p>
                        <p className="mt-2 text-sm/6 text-muted-foreground">
                          {truncateText(finding.explanation, 110)}
                        </p>
                      </button>
                    ))}
                  </div>

                  {totalFindingPages > 1 ? (
                    <Pagination className="mt-4 justify-start">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            text="Previous"
                            aria-disabled={findingsPage === 1}
                            className={
                              findingsPage === 1
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                            onClick={(event) => {
                              event.preventDefault()
                              const nextPage = Math.max(1, findingsPage - 1)
                              setFindingsPage(nextPage)
                              setActiveFindingId(
                                result.findings[
                                  (nextPage - 1) * findingsPerPage
                                ]?.id ?? activeFinding.id
                              )
                            }}
                          />
                        </PaginationItem>

                        {Array.from(
                          { length: totalFindingPages },
                          (_, index) => index + 1
                        ).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              isActive={page === findingsPage}
                              onClick={(event) => {
                                event.preventDefault()
                                setFindingsPage(page)
                                setActiveFindingId(
                                  result.findings[
                                    (page - 1) * findingsPerPage
                                  ]?.id ?? activeFinding.id
                                )
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
                            aria-disabled={findingsPage === totalFindingPages}
                            className={
                              findingsPage === totalFindingPages
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                            onClick={(event) => {
                              event.preventDefault()
                              const nextPage = Math.min(
                                totalFindingPages,
                                findingsPage + 1
                              )
                              setFindingsPage(nextPage)
                              setActiveFindingId(
                                result.findings[
                                  (nextPage - 1) * findingsPerPage
                                ]?.id ?? activeFinding.id
                              )
                            }}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  ) : null}
                </FadeIn>

                <FadeIn className="rounded-[1.6rem] border border-border/80 bg-background/65 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={`rounded-full capitalize ${
                        activeFinding.severity === "high"
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : activeFinding.severity === "medium"
                            ? "bg-yellow-400 text-black hover:bg-yellow-500"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {activeFinding.severity}
                    </Badge>
                    <Badge variant="outline" className="rounded-full font-mono">
                      {(activeFinding.confidence * 100).toFixed(0)}%
                    </Badge>
                    {activeFinding.metricDelta ? (
                      <Badge variant="outline" className="rounded-full">
                        {activeFinding.metricDelta}
                      </Badge>
                    ) : null}
                  </div>

                  <h2 className="mt-4 font-heading text-2xl font-semibold">
                    {activeFinding.title}
                  </h2>
                  <p className="mt-3 text-sm/6 text-muted-foreground">
                    {activeFinding.explanation}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.25rem] border border-border/80 bg-background/70 p-4">
                      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                        Why it matters
                      </p>
                      <p className="mt-2 text-sm/6 text-foreground/85">
                        {activeFinding.impact ?? "Highest-ranked signal in the current page."}
                      </p>
                    </div>
                    <div className="rounded-[1.25rem] border border-border/80 bg-background/70 p-4">
                      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                        Next step
                      </p>
                      <p className="mt-2 text-sm/6 text-foreground/85">
                        {activeFinding.recommendation ??
                          "Open the evidence tab to confirm the source."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.25rem] border border-border/80 bg-background/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                        Primary evidence
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("trust")}
                        className="text-xs font-medium text-primary transition hover:opacity-80"
                      >
                        Open trust view
                      </button>
                    </div>

                    {primaryEvidence ? (
                      <>
                        <p className="mt-3 text-sm/6 text-foreground/85">
                          {truncateText(primaryEvidence.content, 180)}
                        </p>
                        {formatEvidenceMeta(primaryEvidence) ? (
                          <p className="mt-3 text-xs text-muted-foreground">
                            {formatEvidenceMeta(primaryEvidence)}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        No linked evidence in the current payload.
                      </p>
                    )}
                  </div>
                </FadeIn>
              </div>
            </TabsContent>

            <TabsContent value="compare">
              <ComparePanel result={result} />
            </TabsContent>

            <TabsContent value="trust" className="space-y-4">
              <VerificationPanel result={result} />
              <ProvenanceViewer finding={activeFinding} evidence={activeEvidence} />
            </TabsContent>

            <TabsContent value="graph" className="space-y-4">
              <GraphPanel
                graph={result.graph}
                activeNodeIds={activeGraphNodeIds}
                findingTitle={activeFinding.title}
              />
              <AskGraphPanel result={result} activeFinding={activeFinding} />
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </>
  )
}
