"use client"

import * as React from "react"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { type ResultResponse } from "@/lib/types"

type ExportBriefButtonProps = {
  result: ResultResponse
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

  const prefix = parts.length > 0 ? `${parts.join(" · ")}: ` : ""
  const snippet =
    item.content.length > 180
      ? `${item.content.slice(0, 180).trimEnd()}...`
      : item.content

  return `- ${prefix}${snippet}`
}

function buildBrief(result: ResultResponse) {
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

  const lines: string[] = [
    `# SignalLens Analyst Brief`,
    ``,
    `Document: ${result.filename}`,
    `Generated: ${new Date().toLocaleString("en-US")}`,
    `Headline: ${result.summary.headline}`,
    ``,
    `## Executive Summary`,
    result.summary.overview,
    ``,
    `## Snapshot`,
    `- Findings: ${result.stats.totalFindings}`,
    `- High risk: ${result.stats.highRiskCount}`,
    `- Overall confidence: ${result.stats.confidenceScore}%`,
    `- Graph size: ${result.stats.entityCount} nodes / ${result.stats.relationshipCount} edges`,
    ``,
    `## Top Findings`,
  ]

  for (const [index, finding] of result.findings.slice(0, 3).entries()) {
    lines.push(`${index + 1}. ${finding.title}`)
    lines.push(`   - Confidence: ${(finding.confidence * 100).toFixed(0)}%`)
    if (finding.metricDelta) {
      lines.push(`   - Signal: ${finding.metricDelta}`)
    }
    lines.push(`   - Why it matters: ${finding.impact ?? finding.explanation}`)
    lines.push(
      `   - Next step: ${
        finding.recommendation ?? "Review the linked evidence and confirm the source figure."
      }`
    )

    const evidenceLines = finding.evidenceIds
      .slice(0, 2)
      .map((evidenceId) => buildEvidenceLine(result, evidenceId))
      .filter(Boolean) as string[]

    if (evidenceLines.length > 0) {
      lines.push(`   - Evidence:`)
      for (const evidenceLine of evidenceLines) {
        lines.push(`     ${evidenceLine}`)
      }
    }

    lines.push(``)
  }

  lines.push(`## Compare Mode`)
  lines.push(comparison.headline)
  lines.push(comparison.summary)
  lines.push(``)
  for (const change of comparison.changes.slice(0, 3)) {
    const parts = [change.label]
    if (change.changePercentLabel) {
      parts.push(change.changePercentLabel)
    }
    if (change.previousValueLabel && change.currentValueLabel) {
      parts.push(`${change.previousValueLabel} -> ${change.currentValueLabel}`)
    }
    lines.push(`- ${parts.join(" · ")}`)
  }
  lines.push(``)

  lines.push(`## Official Verification`)
  lines.push(verification.headline)
  for (const check of verification.checks.slice(0, 3)) {
    const valueLine =
      check.documentValueLabel || check.officialValueLabel
        ? ` (${check.documentValueLabel ?? "n/a"} vs ${check.officialValueLabel ?? "n/a"})`
        : ""
    lines.push(`- ${check.title}: ${check.status}${valueLine}`)
    lines.push(`  ${check.summary}`)
    if (check.sourceUrl) {
      lines.push(`  Source: ${check.sourceUrl}`)
    }
  }
  lines.push(``)

  lines.push(`## Talk Track`)
  for (const takeaway of result.summary.keyTakeaways.slice(0, 3)) {
    lines.push(`- ${takeaway}`)
  }

  return lines.join("\n")
}

export default function ExportBriefButton({
  result,
}: ExportBriefButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false)

  function handleExport() {
    setIsExporting(true)

    try {
      const brief = buildBrief(result)
      const blob = new Blob([brief], { type: "text/markdown;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      const baseName = result.filename.replace(/\.[^.]+$/, "")

      anchor.href = url
      anchor.download = `${baseName}-analyst-brief.md`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
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
