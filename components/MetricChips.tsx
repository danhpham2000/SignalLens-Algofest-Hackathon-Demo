import { BadgeAlert, BrainCircuit, Network, ScanText } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { FadeIn } from "@/components/ui/motion"
import { type SummaryStats } from "@/lib/types"

type MetricChipsProps = {
  stats: SummaryStats
}

type ChipConfig = {
  key: keyof Pick<
    SummaryStats,
    "highRiskCount" | "entityCount" | "relationshipCount" | "confidenceScore"
  >
  label: string
  description: string
  icon: typeof BadgeAlert
  suffix?: string
}

const chipConfig: ChipConfig[] = [
  {
    key: "highRiskCount",
    label: "High-risk findings",
    description: "Top anomalies ranked for review",
    icon: BadgeAlert,
  },
  {
    key: "entityCount",
    label: "Entities extracted",
    description: "Metrics, sections, vendors, and periods",
    icon: ScanText,
  },
  {
    key: "relationshipCount",
    label: "Relationships mapped",
    description: "Connected facts written into the graph view",
    icon: Network,
  },
  {
    key: "confidenceScore",
    label: "Confidence score",
    description: "Overall extraction confidence",
    icon: BrainCircuit,
    suffix: "%",
  },
]

export default function MetricChips({ stats }: MetricChipsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {chipConfig.map((chip, index) => {
        const Icon = chip.icon
        const value = stats[chip.key]

        return (
          <FadeIn key={chip.key} delay={index * 0.04}>
            <Card
              key={chip.key}
              className="panel-surface gap-3 border-0 bg-transparent py-0 shadow-none ring-0"
            >
              <CardContent className="flex items-center gap-4 px-5 py-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-2xl font-semibold">
                    {value}
                    {chip.suffix ?? ""}
                  </p>
                  <p className="font-medium">{chip.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {chip.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )
      })}
    </div>
  )
}
