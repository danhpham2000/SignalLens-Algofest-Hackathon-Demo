"use client"

import * as React from "react"
import { startTransition } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ChartNoAxesCombined,
  Network,
  ShieldCheck,
} from "lucide-react"

import Header from "@/components/Header"
import ProcessingState from "@/components/ProcessingState"
import SampleFilePicker from "@/components/SampleFilePicker"
import UploadBox from "@/components/UploadBox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FadeIn, HoverLift } from "@/components/ui/motion"
import { fetchSampleFileAsFile, runDocumentPipeline } from "@/lib/api"
import { PROCESSING_STEPS, sampleFiles } from "@/lib/demo-data"
import { type SampleFile } from "@/lib/types"
import { useTheme } from "next-themes"

const heroStats = [
  {
    label: "Graph-backed",
    description: "Links metrics, sections, counterparties, and risk flags.",
    icon: Network,
  },
  {
    label: "Deterministic scoring",
    description: "Every anomaly card exposes the formula behind its rank.",
    icon: ChartNoAxesCombined,
  },
  {
    label: "Explainable",
    description:
      "Evidence snippets and graph nodes stay connected to each signal.",
    icon: ShieldCheck,
  },
] as const

const workflowSteps = [
  {
    title: "Extract and normalize",
    description:
      "Pull text, tables, periods, amounts, entities, and counterparties from a PDF or screenshot.",
  },
  {
    title: "Rank anomalies",
    description:
      "Apply a deterministic score across magnitude change, evidence strength, and graph risk.",
  },
  {
    title: "Investigate visually",
    description:
      "Open the evidence drawer and graph panel to show exactly why the alert was flagged.",
  },
] as const

export default function Hero() {
  const { theme } = useTheme()

  const router = useRouter()
  const [selectedSampleId, setSelectedSampleId] = React.useState(
    sampleFiles[0]?.id ?? ""
  )
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [activeStep, setActiveStep] = React.useState(0)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const selectedSample =
    sampleFiles.find((sample) => sample.id === selectedSampleId) ??
    sampleFiles[0]

  const runBackendFlow = React.useCallback(
    async (file: File) => {
      setErrorMessage(null)
      setIsProcessing(true)
      setActiveStep(0)

      try {
        const { documentId } = await runDocumentPipeline(file, (stepIndex) => {
          setActiveStep(stepIndex)
        })

        startTransition(() => {
          router.push(`/results/${documentId}`)
        })
      } catch (error) {
        setIsProcessing(false)
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The backend request failed. Make sure FastAPI is running on port 8000."
        )
      }
    },
    [router]
  )

  const handleLaunchSample = React.useCallback(
    async (sample: SampleFile) => {
      setSelectedSampleId(sample.id)

      if (!sample.viewHref) {
        setErrorMessage("This sample is missing a real file.")
        return
      }

      const mimeType =
        sample.fileType === "pdf"
          ? "application/pdf"
          : sample.fileType === "png"
            ? "image/png"
            : "image/jpeg"

      try {
        const file = await fetchSampleFileAsFile(
          sample.viewHref,
          sample.filename,
          mimeType
        )
        await runBackendFlow(file)
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load the sample file."
        )
      }
    },
    [runBackendFlow]
  )

  return (
    <>
      <Header
        primaryAction={{
          href: "#samples",
          label: "View sample files",
        }}
        secondaryAction={{
          href: "#workflow",
          label: "How it works",
          variant: "outline",
        }}
      />

      <main className="page-shell space-y-10 py-8">
        <section className="grid gap-7 xl:grid-cols-[1.02fr_0.98fr]">
          <div className="panel-surface rounded-[2rem] p-7 sm:p-9">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-4">
                Financial document intelligence
              </Badge>
            </div>

            <div className="mt-6 max-w-3xl space-y-5">
              <h1 className="font-heading text-4xl font-semibold tracking-tight">
                Turn dense finance docs into ranked signals with evidence and a
                graph view.
              </h1>
              <p className="max-w-2xl text-base/7 text-foreground/80 sm:text-lg/8">
                Extract metrics, score anomalies, and open a graph-backed
                investigation view from one PDF or screenshot.
              </p>
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <Button
                className="rounded-full"
                disabled={isProcessing || !selectedSample}
                onClick={() => {
                  if (selectedSample) {
                    handleLaunchSample(selectedSample)
                  }
                }}
              >
                Analyze selected sample
                <ArrowRight />
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <a href="#samples">Browse sample files</a>
              </Button>
            </div>

            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {heroStats.map((item) => {
                const Icon = item.icon

                return (
                  <HoverLift
                    key={item.label}
                    transition={{ duration: 0.18 }}
                    className="rounded-[1.5rem] border border-border/80 bg-background/70 p-4"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 font-medium">{item.label}</p>
                    {/* <p className="mt-2 text-sm/6 text-muted-foreground">
                      {item.description}
                    </p> */}
                  </HoverLift>
                )
              })}
            </div>
          </div>

          <div className="space-y-6">
            <FadeIn delay={0.08}>
              <UploadBox
                isProcessing={isProcessing}
                onAnalyze={(file) => runBackendFlow(file)}
              />
            </FadeIn>
            <AnimatePresence>
              {errorMessage ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Alert className="border-destructive/20 bg-destructive/10 text-destructive">
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <AnimatePresence mode="wait" initial={false}>
              {isProcessing ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProcessingState
                    activeStep={activeStep}
                    steps={PROCESSING_STEPS}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="samples"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  <SampleFilePicker
                    samples={sampleFiles}
                    selectedSampleId={selectedSampleId}
                    onSelectSample={setSelectedSampleId}
                    onLaunchSample={handleLaunchSample}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <section id="workflow" className="grid gap-6 xl:grid-cols-[1fr]">
          <FadeIn className="panel-surface rounded-[1.9rem] p-7 sm:p-8">
            <p className="text-sm font-medium tracking-[0.22em] text-primary uppercase">
              How it works
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {workflowSteps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.35, delay: index * 0.06 }}
                  className="rounded-[1.45rem] border border-border/80 bg-background/70 p-5"
                >
                  <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">
                    Step {index + 1}
                  </p>
                  <p className="mt-3 font-heading text-xl font-semibold">
                    {step.title}
                  </p>
                  <p className="mt-2 text-sm/6 text-muted-foreground">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </FadeIn>
        </section>
      </main>
    </>
  )
}
