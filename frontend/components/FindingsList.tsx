import { SlidersHorizontal } from "lucide-react"

import FindingCard from "@/components/FindingCard"
import { Badge } from "@/components/ui/badge"
import { FadeIn } from "@/components/ui/motion"
import { type Finding } from "@/lib/types"

type FindingsListProps = {
  findings: Finding[]
  activeFindingId: string
  onViewEvidence: (findingId: string) => void
  onViewGraph: (findingId: string) => void
}

export default function FindingsList({
  findings,
  activeFindingId,
  onViewEvidence,
  onViewGraph,
}: FindingsListProps) {
  return (
    <section className="space-y-4">
      <FadeIn>
        <div className="flex flex-col gap-3 rounded-[1.6rem] border border-border/80 bg-background/65 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium tracking-[0.22em] text-primary uppercase">
              Findings list
            </p>
            <h2 className="font-heading text-2xl font-semibold">
              Ranked anomaly cards
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sorted by deterministic score so the strongest signal stays first.
            </p>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
            <SlidersHorizontal className="h-3 w-3" />
            Severity-ranked
          </Badge>
        </div>
      </FadeIn>

      <div className="space-y-4">
        {findings.map((finding, index) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            index={index}
            isActive={finding.id === activeFindingId}
            onViewEvidence={onViewEvidence}
            onViewGraph={onViewGraph}
          />
        ))}
      </div>
    </section>
  )
}
