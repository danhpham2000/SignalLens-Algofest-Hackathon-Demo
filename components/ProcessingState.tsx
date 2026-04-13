import { motion } from "framer-motion"
import { CheckCircle2, Clock3, Loader2 } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { StaggerGroup, StaggerItem, easeOutExpo } from "@/components/ui/motion"
import { type ProcessingStep } from "@/lib/types"

type ProcessingStateProps = {
  activeStep: number
  steps: ProcessingStep[]
}

export default function ProcessingState({
  activeStep,
  steps,
}: ProcessingStateProps) {
  const progressValue =
    steps.length > 0 ? ((activeStep + 1) / steps.length) * 100 : 0

  return (
    <StaggerGroup
      className="panel-surface rounded-[1.75rem] p-5 sm:p-6"
      stagger={0.05}
    >
      <StaggerItem y={10}>
        <div className="space-y-2">
          <p className="text-sm font-medium tracking-[0.22em] text-primary uppercase">
            Processing pipeline
          </p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-xl font-semibold">
                Building the investigation view
              </h3>
              <p className="text-sm text-muted-foreground">
                Showing the extraction and scoring stages so the workflow feels
                trustworthy in the demo.
              </p>
            </div>
            <motion.div
              key={Math.round(progressValue)}
              initial={{ scale: 0.92, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-medium text-primary"
            >
              {Math.round(progressValue)}%
            </motion.div>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem y={10}>
        <motion.div
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Progress value={progressValue} className="mt-5 h-2 rounded-full" />
        </motion.div>
      </StaggerItem>

      <div className="mt-5 space-y-3">
        {steps.map((step, index) => {
          const isComplete = index < activeStep
          const isCurrent = index === activeStep

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.25,
                delay: index * 0.04,
                ease: easeOutExpo,
              }}
              className={[
                "rounded-2xl border p-4 transition",
                isCurrent
                  ? "border-primary/35 bg-primary/8"
                  : "border-border/70 bg-background/65",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <motion.div
                  animate={isCurrent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={{
                    duration: 0.9,
                    repeat: isCurrent ? Infinity : 0,
                  }}
                  className={[
                    "mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl",
                    isComplete
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Clock3 className="h-4 w-4" />
                  )}
                </motion.div>
                <div className="space-y-1">
                  <p className="font-medium">{step.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </StaggerGroup>
  )
}
