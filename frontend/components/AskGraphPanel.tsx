"use client"

import * as React from "react"
import { MessageSquareQuote, Network } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FadeIn } from "@/components/ui/motion"
import { type EvidenceItem, type Finding, type ResultResponse } from "@/lib/types"

type AskGraphPanelProps = {
  result: ResultResponse
  activeFinding: Finding
}

type PromptId = "why-flagged" | "debt-signals" | "quarter-change"

type PromptAnswer = {
  headline: string
  summary: string
  bullets: string[]
  citations: EvidenceItem[]
}

const promptOptions: Array<{ id: PromptId; label: string }> = [
  { id: "why-flagged", label: "Why was this flagged?" },
  { id: "debt-signals", label: "Show all debt-related signals" },
  { id: "quarter-change", label: "What changed vs last quarter?" },
]

function normalize(value: string) {
  return value.toLowerCase()
}

function uniqueEvidence(result: ResultResponse, evidenceIds: string[]) {
  const seen = new Set<string>()
  const items: EvidenceItem[] = []

  for (const evidenceId of evidenceIds) {
    if (seen.has(evidenceId)) {
      continue
    }

    const item = result.evidence.find((entry) => entry.id === evidenceId)
    if (!item) {
      continue
    }

    seen.add(evidenceId)
    items.push(item)
  }

  return items
}

function buildWhyFlaggedAnswer(
  result: ResultResponse,
  finding: Finding
): PromptAnswer {
  const relatedLabels = result.graph.nodes
    .filter(
      (node) => finding.relatedNodeIds.includes(node.id) && node.id !== finding.id
    )
    .slice(0, 4)
    .map((node) => node.label)

  return {
    headline: "Why this signal was ranked near the top",
    summary: finding.explanation,
    bullets: [
      `Signal strength: ${
        finding.metricDelta ?? `${finding.scoreBreakdown.finalScore.toFixed(1)} final score`
      }.`,
      `Confidence: ${(finding.confidence * 100).toFixed(0)}% with ${finding.evidenceIds.length} linked evidence source${
        finding.evidenceIds.length === 1 ? "" : "s"
      }.`,
      relatedLabels.length > 0
        ? `Graph context: linked to ${relatedLabels.join(", ")}.`
        : "Graph context: this finding is supported directly by the extracted evidence.",
    ],
    citations: uniqueEvidence(result, finding.evidenceIds).slice(0, 3),
  }
}

function buildDebtSignalsAnswer(result: ResultResponse): PromptAnswer {
  const debtTerms = ["debt", "liability", "borrow", "credit", "leverage"]
  const matchingFindings = result.findings.filter((finding) => {
    const haystack = normalize(
      [finding.title, finding.explanation, finding.impact, finding.metricDelta]
        .filter(Boolean)
        .join(" ")
    )
    return debtTerms.some((term) => haystack.includes(term))
  })

  const citations = uniqueEvidence(
    result,
    matchingFindings.flatMap((finding) => finding.evidenceIds)
  ).slice(0, 3)

  if (matchingFindings.length === 0) {
    return {
      headline: "No direct debt signal is currently ranked",
      summary:
        "The current top findings do not explicitly mention debt, liabilities, borrowing, or leverage in the ranked output.",
      bullets: [
        "No debt-focused finding appears in the current top signals.",
        "Use the graph nodes and evidence pages to confirm whether debt-related metrics were present but not flagged.",
      ],
      citations,
    }
  }

  return {
    headline: `Found ${matchingFindings.length} debt-related signal${
      matchingFindings.length === 1 ? "" : "s"
    }`,
    summary:
      "Debt-oriented language appears in the ranked findings and can be traced back to the linked evidence and graph context.",
    bullets: matchingFindings.slice(0, 3).map((finding) => {
      const detail = finding.metricDelta ? ` (${finding.metricDelta})` : ""
      return `${finding.title}${detail} at ${(finding.confidence * 100).toFixed(0)}% confidence.`
    }),
    citations,
  }
}

function buildQuarterChangeAnswer(result: ResultResponse): PromptAnswer {
  const changedFindings = result.findings.filter(
    (finding) => Boolean(finding.metricDelta) || typeof finding.metadata?.change_percent === "number"
  )

  const citations = uniqueEvidence(
    result,
    changedFindings.flatMap((finding) => finding.evidenceIds)
  ).slice(0, 3)

  if (changedFindings.length === 0) {
    return {
      headline: "No period-over-period change is explicit in the current result",
      summary:
        "The current payload does not expose a clear quarter-over-quarter delta in the top findings.",
      bullets: [
        "The strongest findings may be narrative or structural rather than a direct period change.",
      ],
      citations,
    }
  }

  return {
    headline: "Detected the strongest reported changes",
    summary:
      "These findings surface the most visible period shifts in the current document and point back to their supporting evidence.",
    bullets: changedFindings.slice(0, 3).map((finding) => {
      const signal = finding.metricDelta ?? `${finding.scoreBreakdown.finalScore.toFixed(1)} score`
      return `${finding.title}: ${signal}.`
    }),
    citations,
  }
}

function resolveAnswer(
  promptId: PromptId,
  result: ResultResponse,
  activeFinding: Finding
) {
  if (promptId === "debt-signals") {
    return buildDebtSignalsAnswer(result)
  }

  if (promptId === "quarter-change") {
    return buildQuarterChangeAnswer(result)
  }

  return buildWhyFlaggedAnswer(result, activeFinding)
}

export default function AskGraphPanel({
  result,
  activeFinding,
}: AskGraphPanelProps) {
  const [activePromptId, setActivePromptId] = React.useState<PromptId>(
    "why-flagged"
  )

  const answer = React.useMemo(
    () => resolveAnswer(activePromptId, result, activeFinding),
    [activePromptId, result, activeFinding]
  )

  return (
    <FadeIn>
      <Card className="panel-surface gap-4 border-0 bg-transparent py-0 shadow-none ring-0">
        <CardHeader className="gap-3 px-0 pt-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium tracking-[0.22em] text-primary uppercase">
                Ask the graph
              </p>
              <CardTitle className="font-heading text-2xl font-semibold">
                Citation-first graph prompts
              </CardTitle>
              <p className="mt-2 text-sm/6 text-muted-foreground">
                These canned prompts answer from the current result graph and
                linked evidence instead of a freeform chatbot path.
              </p>
            </div>
            <Badge variant="outline" className="w-fit rounded-full">
              <Network className="h-3.5 w-3.5" />
              {result.graph.nodes.length} graph nodes
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 px-0">
          <div className="flex flex-wrap gap-2">
            {promptOptions.map((prompt) => (
              <Button
                key={prompt.id}
                variant={activePromptId === prompt.id ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setActivePromptId(prompt.id)}
              >
                <MessageSquareQuote />
                {prompt.label}
              </Button>
            ))}
          </div>

          <div className="rounded-[1.5rem] border border-border/75 bg-background/70 p-5">
            <p className="font-heading text-xl font-semibold">{answer.headline}</p>
            <p className="mt-2 text-sm/6 text-muted-foreground">
              {answer.summary}
            </p>

            <div className="mt-4 space-y-2">
              {answer.bullets.map((bullet) => (
                <div
                  key={bullet}
                  className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm/6 text-foreground/85"
                >
                  {bullet}
                </div>
              ))}
            </div>

            <div className="mt-5">
              <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                Citations
              </p>
              <div className="mt-3 grid gap-3">
                {answer.citations.length > 0 ? (
                  answer.citations.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[1.2rem] border border-border/80 bg-background/80 p-4"
                    >
                      <div className="flex flex-wrap gap-2">
                        {item.page ? (
                          <Badge variant="outline" className="rounded-full">
                            Page {item.page}
                          </Badge>
                        ) : null}
                        <Badge variant="secondary" className="rounded-full">
                          {item.sourceLabel ?? item.sourceType}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm/6 text-foreground/85">
                        {item.content.length > 180
                          ? `${item.content.slice(0, 180).trimEnd()}...`
                          : item.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No linked citation is available for this prompt in the current payload.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  )
}
