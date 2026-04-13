import Link from "next/link"
import { ArrowRight, SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function EmptyState() {
  return (
    <Empty className="panel-surface min-h-70 rounded-[1.75rem] border border-border/80 bg-background/70">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="rounded-2xl bg-primary/12 text-primary"
        >
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>No findings yet</EmptyTitle>
        <EmptyDescription>
          Upload a document or launch a sample file to see the ranked anomalies,
          supporting evidence, and connected graph view.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild className="rounded-full">
          <Link href="/">
            Start a demo run
            <ArrowRight />
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}
