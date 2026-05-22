"use client"

import { BadgeCheck, ExternalLink, Link2, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { FadeIn } from "@/components/ui/motion"
import { type ResultResponse, type VerificationCheck } from "@/lib/types"

type VerificationPanelProps = {
  result: ResultResponse
}

function statusBadge(status: VerificationCheck["status"]) {
  if (status === "verified") {
    return "bg-emerald-500 text-white hover:bg-emerald-600"
  }

  if (status === "mismatch") {
    return "bg-red-500 text-white hover:bg-red-600"
  }

  if (status === "document-only") {
    return "bg-secondary text-secondary-foreground hover:bg-secondary/80"
  }

  return "bg-secondary text-secondary-foreground hover:bg-secondary/80"
}

function statusIcon(status: VerificationCheck["status"]) {
  if (status === "verified") {
    return <ShieldCheck className="h-4 w-4" />
  }

  if (status === "mismatch") {
    return <ShieldAlert className="h-4 w-4" />
  }

  return <ShieldQuestion className="h-4 w-4" />
}

export default function VerificationPanel({ result }: VerificationPanelProps) {
  const verification = result.verification ?? {
    profileLabel: "Unclassified financial document",
    headline: "No official verification is available yet.",
    checks: [],
  }

  return (
    <FadeIn>
      <Card className="panel-surface gap-4 border-0 bg-transparent py-0 shadow-none ring-0">
        <CardContent className="space-y-4 px-0 pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full">
              <BadgeCheck className="h-3.5 w-3.5" />
              {verification.profileLabel}
            </Badge>
          </div>

          <div className="rounded-[1.5rem] border border-border/75 bg-background/70 p-5">
            <p className="font-medium">{verification.headline}</p>
            <p className="mt-2 text-sm/6 text-muted-foreground">
              Official-data verification uses public-source benchmarks when available and falls back to explicit
              document-only traceability when an exact live dataset match is not supported yet.
            </p>
          </div>

          <div className="grid gap-3">
            {verification.checks.map((check) => (
              <div
                key={check.id}
                className="rounded-[1.35rem] border border-border/80 bg-background/70 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`rounded-full capitalize ${statusBadge(check.status)}`}>
                    {statusIcon(check.status)}
                    {check.status}
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    <Link2 className="h-3.5 w-3.5" />
                    {check.sourceName}
                  </Badge>
                  {check.sourceUrl ? (
                    <a
                      href={check.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary transition hover:opacity-80"
                    >
                      Source
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>

                <p className="mt-3 font-medium">{check.title}</p>
                <p className="mt-2 text-sm/6 text-muted-foreground">
                  {check.summary}
                </p>

                {check.documentValueLabel || check.officialValueLabel ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.2rem] bg-secondary/70 p-4">
                      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                        Document value
                      </p>
                      <p className="mt-2 font-medium">
                        {check.documentValueLabel ?? "Not matched"}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] bg-secondary/70 p-4">
                      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                        Official value
                      </p>
                      <p className="mt-2 font-medium">
                        {check.officialValueLabel ?? "Not available"}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  )
}
