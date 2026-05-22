"use client"

import { ArrowRightLeft, TrendingDown, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { FadeIn } from "@/components/ui/motion"
import { type ComparisonChange, type ResultResponse } from "@/lib/types"

type ComparePanelProps = {
  result: ResultResponse
}

function statusClasses(status: ComparisonChange["status"]) {
  if (status === "worsening") {
    return "bg-red-500 text-white hover:bg-red-600"
  }

  if (status === "improving") {
    return "bg-emerald-500 text-white hover:bg-emerald-600"
  }

  return "bg-secondary text-secondary-foreground hover:bg-secondary/80"
}

export default function ComparePanel({ result }: ComparePanelProps) {
  const comparison = result.comparison ?? {
    mode: "none" as const,
    headline: "No comparison is available yet.",
    summary: "SignalLens needs a comparable prior period to build a change view.",
    changes: [],
  }
  const worsening = comparison.changes.filter((change) => change.status === "worsening").length
  const improving = comparison.changes.filter((change) => change.status === "improving").length

  return (
    <FadeIn>
      <Card className="panel-surface gap-4 border-0 bg-transparent py-0 shadow-none ring-0">
        <CardContent className="space-y-4 px-0 pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              {comparison.mode === "document_periods" ? "Period compare" : "Compare mode"}
            </Badge>
            {comparison.baselineLabel ? (
              <Badge variant="secondary" className="rounded-full">
                {comparison.baselineLabel}
              </Badge>
            ) : null}
          </div>

          <div className="rounded-[1.5rem] border border-border/75 bg-background/70 p-5">
            <p className="font-medium">{comparison.headline}</p>
            <p className="mt-2 text-sm/6 text-muted-foreground">
              {comparison.summary}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.2rem] bg-secondary/70 p-4">
                <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  Compared signals
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold">
                  {comparison.changes.length}
                </p>
              </div>
              <div className="rounded-[1.2rem] bg-secondary/70 p-4">
                <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  Worsening
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold">
                  {worsening}
                </p>
              </div>
              <div className="rounded-[1.2rem] bg-secondary/70 p-4">
                <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                  Improving
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold">
                  {improving}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {comparison.changes.length > 0 ? (
              comparison.changes.map((change) => (
                <div
                  key={change.id}
                  className="rounded-[1.35rem] border border-border/80 bg-background/70 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`rounded-full capitalize ${statusClasses(change.status)}`}>
                      {change.status}
                    </Badge>
                    {change.changePercentLabel ? (
                      <Badge variant="outline" className="rounded-full font-mono">
                        {change.changePercentLabel}
                      </Badge>
                    ) : null}
                    {change.periodLabel ? (
                      <Badge variant="outline" className="rounded-full">
                        {change.periodLabel}
                      </Badge>
                    ) : null}
                  </div>

                  <p className="mt-3 font-medium">{change.label}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-foreground/85">
                    <span className="inline-flex items-center gap-2 rounded-full bg-secondary/70 px-3 py-1">
                      <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
                      {change.previousValueLabel ?? "n/a"}
                    </span>
                    <span className="text-muted-foreground">to</span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-secondary/70 px-3 py-1">
                      <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                      {change.currentValueLabel}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.35rem] border border-border/80 bg-background/70 p-5 text-sm text-muted-foreground">
                No clean current-versus-prior metric pair was available in this result.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  )
}
