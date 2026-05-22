"use client"

import * as React from "react"
import { FileImage, FileSpreadsheet, FileText, ScanSearch } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { FadeIn } from "@/components/ui/motion"
import { type EvidenceItem, type Finding } from "@/lib/types"

type ProvenanceViewerProps = {
  finding: Finding
  evidence: EvidenceItem[]
}

function getEvidenceIcon(item: EvidenceItem) {
  if (item.sourceLabel === "OCR") {
    return <ScanSearch className="h-4 w-4" />
  }

  if (item.sourceType === "table") {
    return <FileSpreadsheet className="h-4 w-4" />
  }

  if (item.sourceType === "image") {
    return <FileImage className="h-4 w-4" />
  }

  return <FileText className="h-4 w-4" />
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, value))
}

function buildHighlightStyle(item: EvidenceItem) {
  if (!item.bbox || !item.pageWidth || !item.pageHeight) {
    return null
  }

  const left = clampPercentage((item.bbox.x0 / item.pageWidth) * 100)
  const top = clampPercentage((item.bbox.y0 / item.pageHeight) * 100)
  const width = clampPercentage(((item.bbox.x1 - item.bbox.x0) / item.pageWidth) * 100)
  const height = clampPercentage(((item.bbox.y1 - item.bbox.y0) / item.pageHeight) * 100)

  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${Math.max(width, 4)}%`,
    height: `${Math.max(height, 4)}%`,
  }
}

export default function ProvenanceViewer({
  finding,
  evidence,
}: ProvenanceViewerProps) {
  const [selectedEvidenceId, setSelectedEvidenceId] = React.useState(
    evidence[0]?.id ?? ""
  )
  const [previewFailed, setPreviewFailed] = React.useState(false)

  React.useEffect(() => {
    setSelectedEvidenceId(evidence[0]?.id ?? "")
    setPreviewFailed(false)
  }, [finding.id, evidence])

  const selectedEvidence =
    evidence.find((item) => item.id === selectedEvidenceId) ?? evidence[0]
  const highlightStyle = selectedEvidence
    ? buildHighlightStyle(selectedEvidence)
    : null

  return (
    <FadeIn>
      <Card className="panel-surface gap-4 border-0 bg-transparent py-0 shadow-none ring-0">
        <CardContent className="space-y-4 px-0 pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full font-mono">
              {(finding.confidence * 100).toFixed(0)}% confidence
            </Badge>
            <Badge variant="outline" className="rounded-full">
              {evidence.length} source{evidence.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="overflow-hidden rounded-[1.5rem] border border-border/75 bg-background/70 p-3">
              <div className="relative overflow-hidden rounded-[1.2rem] border border-border/60 bg-secondary/40">
                {selectedEvidence?.previewUrl && !previewFailed ? (
                  <>
                    <img
                      src={selectedEvidence.previewUrl}
                      alt={`Source preview for ${selectedEvidence.title}`}
                      className="block w-full"
                      onError={() => setPreviewFailed(true)}
                    />
                    {highlightStyle ? (
                      <div
                        className="pointer-events-none absolute border-2 border-cyan-300 bg-cyan-300/20 shadow-[0_0_0_999px_rgba(15,23,42,0.08)]"
                        style={highlightStyle}
                      />
                    ) : null}
                  </>
                ) : (
                  <div className="flex min-h-[22rem] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                    No page preview is available for this evidence in the current payload.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 rounded-[1.5rem] border border-border/75 bg-background/70 p-5">
              {selectedEvidence ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      {getEvidenceIcon(selectedEvidence)}
                      {selectedEvidence.sourceLabel ?? selectedEvidence.sourceType}
                    </Badge>
                    {selectedEvidence.page ? (
                      <Badge variant="outline" className="rounded-full">
                        Page {selectedEvidence.page}
                      </Badge>
                    ) : null}
                    {selectedEvidence.section ? (
                      <Badge variant="outline" className="rounded-full">
                        {selectedEvidence.section}
                      </Badge>
                    ) : null}
                  </div>

                  <div>
                    <p className="font-medium">
                      {selectedEvidence.title}
                    </p>
                    <p className="mt-2 text-sm/6 text-muted-foreground">
                      {selectedEvidence.content.length > 220
                        ? `${selectedEvidence.content.slice(0, 220).trimEnd()}...`
                        : selectedEvidence.content}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.2rem] bg-secondary/70 p-4">
                      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                        Source type
                      </p>
                      <p className="mt-2 font-medium">
                        {selectedEvidence.sourceLabel ?? selectedEvidence.sourceType}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] bg-secondary/70 p-4">
                      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                        Highlight region
                      </p>
                      <p className="mt-2 font-medium">
                        {highlightStyle ? "Detected and highlighted" : "Page-level only"}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No evidence is attached to this finding.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {evidence.map((item) => {
              const isSelected = item.id === selectedEvidence?.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedEvidenceId(item.id)
                    setPreviewFailed(false)
                  }}
                  className={[
                    "rounded-[1.3rem] border p-4 text-left transition",
                    isSelected
                      ? "border-primary/35 bg-primary/8"
                      : "border-border/80 bg-background/70 hover:border-primary/20",
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      {getEvidenceIcon(item)}
                      {item.sourceLabel ?? item.sourceType}
                    </Badge>
                    {item.page ? (
                      <Badge variant="outline" className="rounded-full">
                        Page {item.page}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 font-medium">{item.title}</p>
                  <p className="mt-2 text-sm/6 text-muted-foreground">
                    {item.content.length > 140
                      ? `${item.content.slice(0, 140).trimEnd()}...`
                      : item.content}
                  </p>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  )
}
