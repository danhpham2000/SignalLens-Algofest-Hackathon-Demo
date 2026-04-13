"use client"

import * as React from "react"
import { Clock3, FileStack } from "lucide-react"

import EmptyState from "@/components/EmptyState"
import Header from "@/components/Header"
import SimpleGraphPreview from "@/components/SimpleGraphPreview"
import { Badge } from "@/components/ui/badge"
import { FadeIn } from "@/components/ui/motion"
import { type EvidenceItem, type ResultResponse } from "@/lib/types"

type ResultsWorkspaceProps = {
  result: ResultResponse
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength).trimEnd()}…`
}

function formatEvidenceMeta(item: EvidenceItem) {
  const meta: string[] = []

  if (item.section) {
    meta.push(item.section)
  }

  if (item.page) {
    meta.push(`Page ${item.page}`)
  }

  return meta.join(" · ")
}

export default function ResultsWorkspace({ result }: ResultsWorkspaceProps) {
  const demoFindings = result.findings.slice(0, 3)
  const [activeFindingId, setActiveFindingId] = React.useState(
    demoFindings[0]?.id ?? ""
  )
  const activeFinding =
    demoFindings.find((finding) => finding.id === activeFindingId) ??
    demoFindings[0]
  const activeEvidence = result.evidence
    .filter((item) => activeFinding?.evidenceIds.includes(item.id))
    .slice(0, 2)

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

      <main className="page-shell space-y-6 py-8">
        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <FadeIn className="panel-surface rounded-[1.75rem] p-6 sm:p-8">
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

            <p className="mt-6 text-sm font-medium tracking-[0.22em] text-primary uppercase">
              Demo summary
            </p>
            <h1 className="mt-3 max-w-3xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              {result.summary.headline}
            </h1>
            <p className="mt-3 max-w-3xl text-sm/6 text-muted-foreground sm:text-base/7">
              {result.summary.overview}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.35rem] border border-border/80 bg-background/70 p-4">
                <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  Findings
                </p>
                <p className="mt-2 font-mono text-3xl font-semibold">
                  {result.stats.totalFindings}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-border/80 bg-background/70 p-4">
                <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  High risk
                </p>
                <p className="mt-2 font-mono text-3xl font-semibold">
                  {result.stats.highRiskCount}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-border/80 bg-background/70 p-4">
                <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  Confidence
                </p>
                <p className="mt-2 font-mono text-3xl font-semibold">
                  {result.stats.confidenceScore}%
                </p>
              </div>
            </div>

            {result.summary.keyTakeaways.length > 0 ? (
              <div className="mt-6 rounded-[1.45rem] border border-border/80 bg-background/65 p-5">
                <p className="text-sm font-medium">Talk track</p>
                <div className="mt-3 space-y-2">
                  {result.summary.keyTakeaways
                    .slice(0, 3)
                    .map((takeaway, index) => (
                      <div
                        key={takeaway}
                        className="flex items-start gap-3 rounded-2xl bg-background/80 px-4 py-3"
                      >
                        <span className="mt-0.5 font-mono text-xs text-primary">
                          0{index + 1}
                        </span>
                        <p className="text-sm/6 text-foreground/85">
                          {takeaway}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
          </FadeIn>

          <FadeIn
            delay={0.05}
            className="panel-surface rounded-[1.75rem] p-6 sm:p-7"
          >
            <p className="text-sm font-medium tracking-[0.22em] text-primary uppercase">
              Focused review
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
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
              {activeFinding.metricDelta ? (
                <Badge variant="outline" className="rounded-full">
                  {activeFinding.metricDelta}
                </Badge>
              ) : null}
              {activeFinding.section ? (
                <Badge variant="outline" className="rounded-full">
                  {activeFinding.section}
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
              <div className="rounded-[1.3rem] border border-border/80 bg-background/70 p-4">
                <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  Why it matters
                </p>
                <p className="mt-2 text-sm/6 text-foreground/85">
                  {activeFinding.impact ??
                    "This is the clearest signal to explain during the demo."}
                </p>
              </div>
              <div className="rounded-[1.3rem] border border-border/80 bg-background/70 p-4">
                <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  Next step
                </p>
                <p className="mt-2 text-sm/6 text-foreground/85">
                  {activeFinding.recommendation ??
                    `Review the ${activeFinding.evidenceIds.length} linked evidence snippet(s) to confirm the signal.`}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline" className="rounded-full font-mono">
                  {(activeFinding.confidence * 100).toFixed(0)}% confidence
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {activeFinding.evidenceIds.length} evidence source
                  {activeFinding.evidenceIds.length === 1 ? "" : "s"}
                </Badge>
              </div>

              {activeEvidence.length > 0 ? (
                activeEvidence.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.3rem] border border-border/80 bg-background/70 p-4"
                  >
                    <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                      Evidence
                    </p>
                    <p className="mt-2 text-sm/6 text-foreground/85">
                      {truncateText(item.content, 220)}
                    </p>
                    {formatEvidenceMeta(item) ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {formatEvidenceMeta(item)}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[1.3rem] border border-dashed border-border/80 bg-background/60 p-4 text-sm text-muted-foreground">
                  No evidence snippet is attached to this finding in the current
                  payload.
                </div>
              )}
            </div>
          </FadeIn>
        </section>

        <section className="space-y-4">
          <FadeIn>
            <div className="flex flex-col gap-3 rounded-[1.6rem] border border-border/80 bg-background/65 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium tracking-[0.22em] text-primary uppercase">
                  Top findings
                </p>
                <h2 className="font-heading text-2xl font-semibold">
                  Keep the demo to the strongest signals
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tap a card to switch the detail panel on the right.
                </p>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                Showing {demoFindings.length}
                {result.findings.length > demoFindings.length
                  ? ` of ${result.findings.length}`
                  : ""}
              </Badge>
            </div>
          </FadeIn>

          <div className="grid gap-4 lg:grid-cols-3">
            {demoFindings.map((finding) => (
              <FadeIn key={finding.id}>
                <button
                  type="button"
                  onClick={() => setActiveFindingId(finding.id)}
                  className={[
                    "h-full w-full rounded-[1.45rem] border p-5 text-left transition",
                    finding.id === activeFinding.id
                      ? "border-primary/30 bg-background/85 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.55)]"
                      : "border-border/80 bg-background/65 hover:border-primary/20 hover:bg-background/80",
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

                  <h3 className="mt-4 font-heading text-lg font-semibold">
                    {finding.title}
                  </h3>
                  <p className="mt-2 text-sm/6 text-muted-foreground">
                    {truncateText(finding.explanation, 140)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {finding.metricDelta ? (
                      <Badge variant="outline" className="rounded-full">
                        {finding.metricDelta}
                      </Badge>
                    ) : null}
                    {finding.section ? (
                      <Badge variant="outline" className="rounded-full">
                        {finding.section}
                      </Badge>
                    ) : null}
                  </div>
                </button>
              </FadeIn>
            ))}
          </div>

          {result.findings.length > demoFindings.length}
        </section>

        <section className="space-y-4">
          <FadeIn>
            <div className="flex flex-col gap-3 rounded-[1.6rem] border border-border/80 bg-background/65 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium tracking-[0.22em] text-primary uppercase">
                  Simple graph
                </p>
                <h2 className="font-heading text-2xl font-semibold">
                  Quick visual of connected facts
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The selected finding stays in the center with its nearest
                  linked nodes around it.
                </p>
              </div>
            </div>
          </FadeIn>

          <FadeIn>
            <SimpleGraphPreview
              graph={result.graph}
              activeFindingId={activeFinding.id}
              findingTitle={activeFinding.title}
              relatedNodeIds={activeFinding.relatedNodeIds}
            />
          </FadeIn>
        </section>
      </main>
    </>
  )
}
