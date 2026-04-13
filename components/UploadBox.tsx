"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { FileImage, FileText, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StaggerGroup, StaggerItem, easeOutExpo } from "@/components/ui/motion"

type UploadBoxProps = {
  onAnalyze?: (file: File) => void | Promise<void>
  isProcessing?: boolean
  acceptedTypes?: string[]
  maxSizeMB?: number
}

export default function UploadBox({
  onAnalyze,
  isProcessing = false,
  acceptedTypes = ["application/pdf", "image/png", "image/jpeg"],
  maxSizeMB = 10,
}: UploadBoxProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [dragActive, setDragActive] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const validateFile = (file: File) => {
    if (!acceptedTypes.includes(file.type)) {
      return "Only PDF, PNG, and JPG files are supported."
    }

    const maxBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxBytes) {
      return `File must be smaller than ${maxSizeMB}MB.`
    }

    return null
  }

  const handleFile = (file: File) => {
    const validationError = validateFile(file)

    if (validationError) {
      setError(validationError)
      setSelectedFile(null)
      return
    }

    setError(null)
    setSelectedFile(file)
  }

  const handleRemove = () => {
    setSelectedFile(null)
    setError(null)

    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: easeOutExpo }}
    >
      <Card className="panel-surface gap-5 border-0 bg-transparent p-5 shadow-none ring-0">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="font-heading text-2xl font-semibold">
            Upload a financial PDF or screenshot
          </CardTitle>
          <CardDescription className="max-w-xl text-sm/6 text-muted-foreground">
            Drop a report page, KPI dashboard, or ledger snapshot.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-0">
          <motion.div
            onClick={() => !isProcessing && inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault()
              if (!isProcessing) {
                setDragActive(true)
              }
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragActive(false)

              if (isProcessing) {
                return
              }

              const file = event.dataTransfer.files?.[0]

              if (file) {
                handleFile(file)
              }
            }}
            animate={
              dragActive
                ? { scale: 1.01, borderColor: "rgba(39,133,199,0.55)" }
                : { scale: 1, borderColor: "rgba(0,0,0,0)" }
            }
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={[
              "rounded-[1.75rem] border border-dashed p-6 transition sm:p-7",
              dragActive
                ? "border-primary bg-primary/8"
                : "border-border/80 bg-background/70 hover:border-primary/40 hover:bg-background/90",
              isProcessing ? "cursor-not-allowed opacity-70" : "cursor-pointer",
            ].join(" ")}
          >
            <Input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(event) => {
                const file = event.target.files?.[0]

                if (file) {
                  handleFile(file)
                }
              }}
              className="hidden"
              disabled={isProcessing}
            />

            <StaggerGroup
              className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
              delayChildren={0.06}
              stagger={0.06}
            >
              <div className="space-y-3">
                <StaggerItem y={10}>
                  <motion.div
                    animate={
                      dragActive
                        ? { rotate: 4, scale: 1.06 }
                        : { rotate: 0, scale: 1 }
                    }
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary"
                  >
                    <Upload className="h-6 w-6" />
                  </motion.div>
                </StaggerItem>
                <div className="space-y-2">
                  <StaggerItem y={10}>
                    <p className="font-medium text-foreground">
                      Drop a financial PDF or dashboard screenshot
                    </p>
                  </StaggerItem>
                  <StaggerItem y={10}>
                    <p className="text-sm text-muted-foreground">
                      Supports PDF, PNG, and JPG up to {maxSizeMB}MB
                    </p>
                  </StaggerItem>
                </div>
              </div>
            </StaggerGroup>
          </motion.div>

          <AnimatePresence mode="wait">
            {selectedFile ? (
              <motion.div
                key={selectedFile.name}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.25, ease: easeOutExpo }}
                className="rounded-[1.4rem] border border-border/80 bg-background/75 p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <motion.div
                      initial={{ rotate: -10, scale: 0.9 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ duration: 0.25 }}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground"
                    >
                      {selectedFile.type === "application/pdf" ? (
                        <FileText className="h-5 w-5" />
                      ) : (
                        <FileImage className="h-5 w-5" />
                      )}
                    </motion.div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      onClick={handleRemove}
                      disabled={isProcessing}
                      className="rounded-full"
                    >
                      <X />
                      Remove
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedFile) {
                          onAnalyze?.(selectedFile)
                        }
                      }}
                      disabled={isProcessing}
                      className="rounded-full"
                    >
                      Analyze document
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {error ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-destructive/15 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}
