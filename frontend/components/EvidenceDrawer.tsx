import { motion } from "framer-motion"
import { FileImage, FileSpreadsheet, FileText, Quote } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FadeIn, StaggerGroup, StaggerItem } from "@/components/ui/motion"
import { type EvidenceItem, type Finding } from "@/lib/types"

type EvidenceDrawerProps = {
  finding: Finding
  evidence: EvidenceItem[]
}

function getEvidenceIcon(sourceType: EvidenceItem["sourceType"]) {
  if (sourceType === "table") {
    return <FileSpreadsheet className="h-4 w-4" />
  }

  if (sourceType === "image") {
    return <FileImage className="h-4 w-4" />
  }

  return <FileText className="h-4 w-4" />
}

export default function EvidenceDrawer({
  finding,
  evidence,
}: EvidenceDrawerProps) {
  return (
    <FadeIn>
      <Card
        id="evidence-panel"
        className="panel-surface gap-4 border-0 bg-transparent py-0 shadow-none ring-0"
      >
        <CardHeader className="gap-3 px-0 pt-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium tracking-[0.22em] text-primary uppercase">
                Evidence drawer
              </p>
              <CardTitle className="font-heading text-2xl font-semibold">
                {finding.title}
              </CardTitle>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Badge variant="outline" className="rounded-full capitalize">
                {finding.evidenceIds.length} sources
              </Badge>
            </motion.div>
          </div>
          <p className="text-sm/6 text-muted-foreground">
            Supporting snippets, rows, or image crops linked directly to this
            finding.
          </p>
        </CardHeader>

        <CardContent className="px-0">
          <ScrollArea className="max-h-115 pr-4">
            <StaggerGroup className="space-y-3" stagger={0.06}>
              {evidence.map((item) => (
                <StaggerItem key={item.id} y={10}>
                  <motion.div
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.18 }}
                    className="rounded-[1.4rem] border border-border/80 bg-background/70 p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="rounded-full capitalize"
                      >
                        {getEvidenceIcon(item.sourceType)}
                        {item.sourceType}
                      </Badge>
                      {item.section ? (
                        <Badge variant="outline" className="rounded-full">
                          {item.section}
                        </Badge>
                      ) : null}
                      {item.page ? (
                        <Badge variant="outline" className="rounded-full">
                          Page {item.page}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-4 font-medium">{item.title}</p>
                    <motion.div
                      initial={{ opacity: 0.75 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.28 }}
                      className="mt-3 rounded-2xl bg-secondary/70 p-4"
                    >
                      <p className="inline-flex items-center gap-2 text-xs tracking-[0.18em] text-muted-foreground uppercase">
                        <Quote className="h-3.5 w-3.5" />
                        Supporting snippet
                      </p>
                      <p className="mt-3 text-sm/6 text-foreground/85">
                        {item.content}
                      </p>
                    </motion.div>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </ScrollArea>
        </CardContent>
      </Card>
    </FadeIn>
  )
}
