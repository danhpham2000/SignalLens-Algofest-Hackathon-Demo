import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"

import { FadeIn, StaggerGroup, StaggerItem } from "@/components/ui/motion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type Finding, type ResultSummary } from "@/lib/types"

type SummaryPanelProps = {
  summary: ResultSummary
  topFindings: Finding[]
}

export default function SummaryPanel({
  summary,
  topFindings,
}: SummaryPanelProps) {
  return (
    <FadeIn>
      <Card className="panel-surface gap-5 border-0 bg-transparent py-0 shadow-none ring-0">
        <CardHeader className="gap-4 px-0 pt-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.24 }}
          >
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              <Sparkles className="h-3 w-3" />
              Top findings
            </Badge>
          </motion.div>

          <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-3">
              <CardTitle className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                {summary.title}
              </CardTitle>
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.32, delay: 0.04 }}
                className="max-w-3xl text-base/7 text-foreground/85"
              >
                {summary.headline}
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.32, delay: 0.09 }}
                className="max-w-3xl text-sm/6 text-muted-foreground"
              >
                {summary.overview}
              </motion.p>
            </div>

            <StaggerGroup
              className="rounded-[1.45rem] border border-border/80 bg-background/65 p-5"
              delayChildren={0.08}
              stagger={0.06}
            >
              <StaggerItem y={10}>
                <p className="text-sm font-medium text-muted-foreground">
                  What changed
                </p>
              </StaggerItem>
              <div className="mt-4 space-y-2">
                {summary.keyTakeaways.map((takeaway, index) => (
                  <StaggerItem key={takeaway} y={10}>
                    <div className="flex items-start gap-3 rounded-2xl bg-background/80 px-4 py-3">
                      <motion.div
                        initial={{ scale: 0.88, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.22, delay: index * 0.04 }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 font-mono text-[11px] font-semibold text-primary"
                      >
                        0{index + 1}
                      </motion.div>
                      <p className="text-sm/6 text-foreground/80">{takeaway}</p>
                    </div>
                  </StaggerItem>
                ))}
              </div>
            </StaggerGroup>
          </div>
        </CardHeader>

        <CardContent className="px-0">
          <StaggerGroup className="grid gap-3 md:grid-cols-3" stagger={0.07}>
            {topFindings.map((finding, index) => (
              <StaggerItem key={finding.id} y={12}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-[1.35rem] border border-border/80 bg-background/65 px-5 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      #{index + 1}
                    </span>
                    <Badge
                      variant={
                        finding.severity === "high" ? "default" : "secondary"
                      }
                      className="rounded-full capitalize"
                    >
                      {finding.severity}
                    </Badge>
                  </div>
                  <p className="mt-3 font-heading text-lg font-semibold">
                    {finding.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {finding.metricDelta ??
                      finding.section ??
                      "Signal detected"}
                  </p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </CardContent>
      </Card>
    </FadeIn>
  )
}
