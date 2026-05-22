"use client"

import Link from "next/link"
import * as React from "react"
import { motion } from "framer-motion"
import {
  BarChart3,
  ExternalLink,
  FileImage,
  FileText,
  FileWarning,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HoverLift, StaggerGroup, StaggerItem } from "@/components/ui/motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type SampleFile, type SampleFileKind } from "@/lib/types"

type SampleFilePickerProps = {
  samples: SampleFile[]
  selectedSampleId: string
  onSelectSample: (sampleId: string) => void
  onLaunchSample: (sample: SampleFile) => void | Promise<void>
  isProcessing?: boolean
  embedded?: boolean
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

const sampleTabs: Array<{
  id: SampleFileKind
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "image", label: "Image", icon: FileImage },
  { id: "chart-image", label: "Chart image", icon: BarChart3 },
]

export default function SampleFilePicker({
  samples,
  selectedSampleId,
  onSelectSample,
  onLaunchSample,
  isProcessing = false,
  embedded = false,
}: SampleFilePickerProps) {
  const selectedSample =
    samples.find((sample) => sample.id === selectedSampleId) ?? samples[0]
  const [activeTab, setActiveTab] = React.useState<SampleFileKind>(
    selectedSample?.kind ?? "pdf"
  )

  React.useEffect(() => {
    if (selectedSample) {
      setActiveTab(selectedSample.kind)
    }
  }, [selectedSample])

  const samplesByKind = {
    pdf: samples.filter((sample) => sample.kind === "pdf"),
    image: samples.filter((sample) => sample.kind === "image"),
    "chart-image": samples.filter((sample) => sample.kind === "chart-image"),
  } satisfies Record<SampleFileKind, SampleFile[]>

  function handleTabChange(nextTab: string) {
    const normalizedTab = nextTab as SampleFileKind
    setActiveTab(normalizedTab)

    const firstSample = samplesByKind[normalizedTab][0]
    if (firstSample) {
      onSelectSample(firstSample.id)
    }
  }

  return (
    <StaggerGroup
      id="samples"
      className={[
        "rounded-[1.75rem]",
        embedded ? "p-0" : "panel-surface p-5 sm:p-6",
      ].join(" ")}
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
              Switch by input type so the sample list stays short and easy to
              scan.
            </p>
          </div>
        </div>
      </StaggerItem>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="mt-5"
      >
        <TabsList
          className="grid w-full grid-cols-3 rounded-2xl bg-secondary/85 p-1"
        >
          {sampleTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-xl text-xs sm:text-sm"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {sampleTabs.map((tab) => {
          const tabSamples = samplesByKind[tab.id]

          return (
            <TabsContent key={tab.id} value={tab.id} className="mt-4">
              <div className="grid gap-3">
                {tabSamples.length === 0 ? (
                  <div className="rounded-[1.35rem] border border-dashed border-border/80 bg-background/60 p-5 text-sm text-muted-foreground">
                    No samples are loaded for this tab yet.
                  </div>
                ) : null}
                {tabSamples.map((sample, index) => {
                  const isSelected = sample.id === selectedSampleId

                  return (
                    <StaggerItem key={sample.id} y={10}>
                      <HoverLift
                        transition={{ duration: 0.18 }}
                        className={[
                          "rounded-[1.35rem] border p-4 transition",
                          isSelected
                            ? "border-primary/35 bg-primary/8"
                            : "border-border/75 bg-background/70 hover:border-primary/20",
                        ].join(" ")}
                      >
                        <motion.div
                          animate={
                            isSelected
                              ? {
                                  boxShadow:
                                    "0 16px 36px -30px rgba(39,133,199,0.35)",
                                }
                              : { boxShadow: "0 0 0 rgba(0,0,0,0)" }
                          }
                          transition={{ duration: 0.2 }}
                          className="flex flex-col gap-3"
                        >
                          <button
                            type="button"
                            onClick={() => onSelectSample(sample.id)}
                            disabled={isProcessing}
                            className="flex items-start gap-3 text-left disabled:cursor-not-allowed"
                          >
                            <motion.div
                              initial={{ opacity: 0, scale: 0.94 }}
                              whileInView={{ opacity: 1, scale: 1 }}
                              viewport={{ once: true }}
                              transition={{
                                duration: 0.2,
                                delay: index * 0.025,
                              }}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground"
                            >
                              {getSampleIcon(sample.fileType)}
                            </motion.div>

                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium leading-5">
                                  {sample.name}
                                </p>
                                {isSelected ? (
                                  <Badge className="rounded-full">
                                    Selected
                                  </Badge>
                                ) : null}
                              </div>
                              {sample.description ? (
                                <p className="text-sm leading-6 text-muted-foreground">
                                  {sample.description}
                                </p>
                              ) : null}
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant="secondary"
                                  className="rounded-full"
                                >
                                  {sample.filename}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="rounded-full"
                                >
                                  {sample.focus}
                                </Badge>
                              </div>
                            </div>
                          </button>

                          <div className="flex flex-wrap gap-2 pl-[3.25rem]">
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              className="rounded-full"
                              onClick={() => onLaunchSample(sample)}
                              disabled={isProcessing}
                            >
                              Try sample
                            </Button>
                            {sample.viewHref ? (
                              <Button
                                asChild
                                variant="ghost"
                                className="rounded-full"
                              >
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
                            {sample.sourceHref ? (
                              <Button
                                asChild
                                variant="ghost"
                                className="rounded-full"
                              >
                                <Link
                                  href={sample.sourceHref}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {sample.sourceLabel ?? "Official source"}
                                  <ExternalLink />
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        </motion.div>
                      </HoverLift>
                    </StaggerItem>
                  )
                })}
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
    </StaggerGroup>
  )
}
