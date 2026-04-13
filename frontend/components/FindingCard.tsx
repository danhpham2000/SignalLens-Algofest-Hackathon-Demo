"use client"

import { motion } from "framer-motion"
import { ChevronRight, Network, ReceiptText } from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { type Finding } from "@/lib/types"

type FindingCardProps = {
  finding: Finding
  isActive: boolean
  index: number
  onViewEvidence: (findingId: string) => void
  onViewGraph: (findingId: string) => void
}

const severityStyles: Record<Finding["severity"], string> = {
  high: "border-l-[6px] border-l-primary",
  medium: "border-l-[6px] border-l-chart-3",
  low: "border-l-[6px] border-l-chart-2",
}

export default function FindingCard({
  finding,
  isActive,
  index,
  onViewEvidence,
  onViewGraph,
}: FindingCardProps) {
  const score = finding.scoreBreakdown
  const contextScore = score.graphRiskScore ?? score.keywordScore ?? 0
  const scoreLine = `${score.changeScore.toFixed(1)} + ${score.severityScore.toFixed(1)} + ${contextScore.toFixed(1)} + ${score.evidenceScore.toFixed(1)} - ${score.uncertaintyPenalty.toFixed(1)}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.38, delay: index * 0.05 }}
    >
      <Card
        className={[
          "panel-surface gap-4 border-0 bg-transparent py-0 shadow-none ring-0 transition",
          severityStyles[finding.severity],
          isActive ? "ring-2 ring-primary/20" : "",
        ].join(" ")}
      >
        <CardContent className="space-y-5 px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full capitalize">
                  {finding.severity}
                </Badge>
                <Badge variant="outline" className="rounded-full capitalize">
                  {finding.category}
                </Badge>
                {finding.section ? (
                  <Badge variant="secondary" className="rounded-full">
                    {finding.section}
                  </Badge>
                ) : null}
              </div>
              <div>
                <h3 className="font-heading text-xl font-semibold tracking-tight">
                  {finding.title}
                </h3>
                <p className="mt-2 max-w-3xl text-sm/6 text-muted-foreground">
                  {finding.explanation}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[220px] lg:grid-cols-1">
              <div className="rounded-[1.2rem] border border-border/80 bg-background/70 px-4 py-4 text-center">
                <p className="font-mono text-3xl font-semibold">
                  {(finding.confidence * 100).toFixed(0)}%
                </p>
                <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  Confidence
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-border/80 bg-background/70 px-4 py-4 text-center">
                <p className="font-mono text-lg font-semibold">
                  {finding.metricDelta ??
                    `${score.finalScore.toFixed(1)} score`}
                </p>
                <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  Signal
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              className="rounded-full"
              onClick={() => onViewEvidence(finding.id)}
            >
              <ReceiptText />
              View evidence
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => onViewGraph(finding.id)}
            >
              <Network />
              Open graph
            </Button>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem
              value="details"
              className="rounded-[1.3rem] border border-border/80 bg-background/65 px-5"
            >
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Why this was flagged</p>
                    <p className="text-sm text-muted-foreground">
                      Impact, recommendation, and deterministic score
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-0">
                <div className="grid gap-4 pb-4 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-[1.2rem] bg-secondary/65 p-4">
                    <p className="text-sm font-medium">Impact</p>
                    <p className="mt-2 text-sm/6 text-muted-foreground">
                      {finding.impact}
                    </p>
                    {finding.recommendation ? (
                      <p className="mt-3 text-sm/6 text-foreground/80">
                        <span className="font-medium text-foreground">
                          Next step:
                        </span>{" "}
                        {finding.recommendation}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-[1.2rem] bg-secondary/65 p-4">
                    <p className="text-sm font-medium">Score breakdown</p>
                    <p className="mt-2 font-mono text-sm text-foreground/85">
                      {scoreLine} = {score.finalScore.toFixed(1)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <Badge
                        variant="outline"
                        className="rounded-full font-mono"
                      >
                        Change {score.changeScore.toFixed(1)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="rounded-full font-mono"
                      >
                        Severity {score.severityScore.toFixed(1)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="rounded-full font-mono"
                      >
                        Context {contextScore.toFixed(1)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="rounded-full font-mono"
                      >
                        Evidence {score.evidenceScore.toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </motion.div>
  )
}
