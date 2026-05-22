"use client"

import * as React from "react"
import { jsPDF } from "jspdf"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { type ResultResponse } from "@/lib/types"

type ExportBriefButtonProps = {
  result: ResultResponse
}

type BriefSection = {
  title: string
  lines: string[]
}

function buildEvidenceLine(result: ResultResponse, evidenceId: string) {
  const item = result.evidence.find((entry) => entry.id === evidenceId)
  if (!item) {
    return null
  }

  const parts = [
    item.page ? `Page ${item.page}` : null,
    item.sourceLabel ?? item.section ?? item.sourceType,
  ].filter(Boolean)

  const prefix = parts.length > 0 ? `${parts.join(" - ")}: ` : ""
  const snippet =
    item.content.length > 180
      ? `${item.content.slice(0, 180).trimEnd()}...`
      : item.content

  return `${prefix}${snippet}`
}

function normalizePdfText(value: string) {
  return value
    .replaceAll("•", "-")
    .replaceAll("·", "-")
    .replaceAll("→", "->")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("’", "'")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("…", "...")
}

function buildBriefSections(result: ResultResponse): BriefSection[] {
  const comparison = result.comparison ?? {
    mode: "none" as const,
    headline: "No comparison is available yet.",
    summary: "SignalLens needs a comparable prior period to build a change view.",
    changes: [],
  }
  const verification = result.verification ?? {
    profileLabel: "Unclassified financial document",
    headline: "No official verification is available yet.",
    checks: [],
  }

  const sections: BriefSection[] = [
    {
      title: "Executive Summary",
      lines: [
        `Document: ${result.filename}`,
        `Generated: ${new Date().toLocaleString("en-US")}`,
        `Headline: ${result.summary.headline}`,
        result.summary.overview,
      ],
    },
    {
      title: "Snapshot",
      lines: [
        `Findings: ${result.stats.totalFindings}`,
        `High risk: ${result.stats.highRiskCount}`,
        `Overall confidence: ${result.stats.confidenceScore}%`,
        `Graph size: ${result.stats.entityCount} nodes / ${result.stats.relationshipCount} edges`,
      ],
    },
  ]

  const findingLines: string[] = []
  for (const [index, finding] of result.findings.slice(0, 3).entries()) {
    findingLines.push(`${index + 1}. ${finding.title}`)
    findingLines.push(`Confidence: ${(finding.confidence * 100).toFixed(0)}%`)
    if (finding.metricDelta) {
      findingLines.push(`Signal: ${finding.metricDelta}`)
    }
    findingLines.push(`Why it matters: ${finding.impact ?? finding.explanation}`)
    findingLines.push(
      `Next step: ${
        finding.recommendation ??
        "Review the linked evidence and confirm the source figure."
      }`
    )

    const evidenceLines = finding.evidenceIds
      .slice(0, 2)
      .map((evidenceId) => buildEvidenceLine(result, evidenceId))
      .filter(Boolean) as string[]

    for (const evidenceLine of evidenceLines) {
      findingLines.push(`Evidence: ${evidenceLine}`)
    }

    findingLines.push("")
  }
  sections.push({ title: "Top Findings", lines: findingLines })

  const compareLines = [comparison.headline, comparison.summary, ""]
  for (const change of comparison.changes.slice(0, 3)) {
    const parts = [change.label]
    if (change.changePercentLabel) {
      parts.push(change.changePercentLabel)
    }
    if (change.previousValueLabel && change.currentValueLabel) {
      parts.push(`${change.previousValueLabel} -> ${change.currentValueLabel}`)
    }
    compareLines.push(parts.join(" - "))
  }
  sections.push({ title: "Compare Mode", lines: compareLines })

  const verificationLines = [verification.headline, ""]
  for (const check of verification.checks.slice(0, 3)) {
    const valueLine =
      check.documentValueLabel || check.officialValueLabel
        ? ` (${check.documentValueLabel ?? "n/a"} vs ${check.officialValueLabel ?? "n/a"})`
        : ""
    verificationLines.push(`${check.title}: ${check.status}${valueLine}`)
    verificationLines.push(check.summary)
    if (check.sourceUrl) {
      verificationLines.push(`Source: ${check.sourceUrl}`)
    }
    verificationLines.push("")
  }
  sections.push({ title: "Official Verification", lines: verificationLines })

  sections.push({
    title: "Talk Track",
    lines: result.summary.keyTakeaways.slice(0, 3),
  })

  return sections
}

function exportBriefPdf(result: ResultResponse) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 48
  const marginTop = 54
  const marginBottom = 50
  const contentWidth = pageWidth - marginX * 2
  let y = marginTop

  const ensurePageSpace = (requiredHeight: number) => {
    if (y + requiredHeight <= pageHeight - marginBottom) {
      return
    }

    doc.addPage()
    y = marginTop
  }

  const addWrappedText = (
    text: string,
    fontSize: number,
    color: [number, number, number],
    extraGap = 0
  ) => {
    const normalized = normalizePdfText(text)
    const lines = doc.splitTextToSize(normalized, contentWidth)
    const lineHeight = fontSize * 1.45

    ensurePageSpace(lines.length * lineHeight + extraGap)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(fontSize)
    doc.setTextColor(...color)
    doc.text(lines, marginX, y)
    y += lines.length * lineHeight + extraGap
  }

  doc.setFillColor(15, 118, 110)
  doc.roundedRect(marginX, 28, contentWidth, 34, 10, 10, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(240, 253, 250)
  doc.text("SignalLens Analyst Brief", marginX + 16, 50)
  y = 86

  const sections = buildBriefSections(result)
  for (const section of sections) {
    ensurePageSpace(28)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(15, 23, 42)
    doc.text(normalizePdfText(section.title), marginX, y)
    y += 20

    for (const line of section.lines) {
      if (!line) {
        y += 8
        continue
      }

      addWrappedText(line, 10.5, [51, 65, 85], 6)
    }

    y += 8
  }

  const baseName = result.filename.replace(/\.[^.]+$/, "")
  doc.save(`${baseName}-analyst-brief.pdf`)
}

export default function ExportBriefButton({
  result,
}: ExportBriefButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false)

  function handleExport() {
    setIsExporting(true)

    try {
      exportBriefPdf(result)
    } finally {
      window.setTimeout(() => setIsExporting(false), 250)
    }
  }

  return (
    <Button
      variant="outline"
      className="rounded-full"
      onClick={handleExport}
      disabled={isExporting}
    >
      <Download />
      {isExporting ? "Exporting..." : "Export analyst brief"}
    </Button>
  )
}
