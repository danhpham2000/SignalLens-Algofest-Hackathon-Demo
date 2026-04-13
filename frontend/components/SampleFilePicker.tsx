"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ExternalLink, FileImage, FileText, FileWarning } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HoverLift, StaggerGroup, StaggerItem } from "@/components/ui/motion"
import { type SampleFile } from "@/lib/types"

type SampleFilePickerProps = {
  samples: SampleFile[]
  selectedSampleId: string
  onSelectSample: (sampleId: string) => void
  onLaunchSample: (sample: SampleFile) => void | Promise<void>
  isProcessing?: boolean
}

function getSampleIcon(fileType: SampleFile["fileType"]) {
  if (fileType === "pdf") {
    return <FileText className="h-5 w-5" />
  }

  if (fileType === "png" || fileType === "jpg" || fileType === "jpeg") {
    return <FileImage className="h-5 w-5" />
  }

  return <FileWarning className="h-5 w-5" />
}

export default function SampleFilePicker({
  samples,
  selectedSampleId,
  onSelectSample,
  onLaunchSample,
  isProcessing = false,
}: SampleFilePickerProps) {
  return (
    <StaggerGroup
      id="samples"
      className="panel-surface rounded-[1.75rem] p-5 sm:p-6"
      delayChildren={0.04}
      stagger={0.06}
    >
      <StaggerItem y={12}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium tracking-[0.22em] text-primary uppercase">
              Sample files
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Pick a sample to jump straight into a realistic anomaly
              investigation flow.
            </p>
          </div>
        </div>
      </StaggerItem>

      <div className="mt-5 grid gap-4">
        {samples.map((sample, index) => {
          const isSelected = sample.id === selectedSampleId

          return (
            <StaggerItem key={sample.id} y={14}>
              <HoverLift
                transition={{ duration: 0.2 }}
                className={[
                  "rounded-[1.5rem] border p-4 transition",
                  isSelected
                    ? "border-primary/35 bg-primary/8"
                    : "border-border/75 bg-background/70 hover:border-primary/20",
                ].join(" ")}
              >
                <motion.div
                  animate={
                    isSelected
                      ? { boxShadow: "0 16px 40px -28px rgba(39,133,199,0.35)" }
                      : { boxShadow: "0 0 0 rgba(0,0,0,0)" }
                  }
                  transition={{ duration: 0.22 }}
                  className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
                >
                  <button
                    type="button"
                    onClick={() => onSelectSample(sample.id)}
                    disabled={isProcessing}
                    className="flex flex-1 items-start gap-4 text-left disabled:cursor-not-allowed"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.22, delay: index * 0.03 }}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground"
                    >
                      {getSampleIcon(sample.fileType)}
                    </motion.div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{sample.name}</p>
                        {isSelected ? (
                          <Badge className="rounded-full">Selected</Badge>
                        ) : null}
                      </div>
                      {/* <p className="text-sm text-muted-foreground">
                        {sample.description}
                      </p> */}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="rounded-full">
                          {sample.filename}
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                          {sample.focus}
                        </Badge>
                      </div>
                      {/* <motion.p
                        animate={isSelected ? { x: 3 } : { x: 0 }}
                        transition={{ duration: 0.18 }}
                        className="text-sm text-foreground/80"
                      >
                        {sample.previewFinding}
                      </motion.p> */}
                    </div>
                  </button>

                  <Button
                    variant={isSelected ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => onLaunchSample(sample)}
                    disabled={isProcessing}
                  >
                    Try sample
                  </Button>
                  {sample.viewHref ? (
                    <Button asChild variant="ghost" className="rounded-full">
                      <Link
                        href={sample.viewHref}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {sample.viewLabel ?? "View file"}
                        <ExternalLink />
                      </Link>
                    </Button>
                  ) : null}
                </motion.div>
              </HoverLift>
            </StaggerItem>
          )
        })}
      </div>
    </StaggerGroup>
  )
}
