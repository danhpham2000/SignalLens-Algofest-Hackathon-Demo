import Link from "next/link"
import { ArrowRight, Compass, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FadeIn,
  HoverLift,
  StaggerGroup,
  StaggerItem,
} from "@/components/ui/motion"

type HeaderAction = {
  href: string
  label: string
  variant?: "default" | "outline" | "ghost"
}

type HeaderProps = {
  eyebrow?: string
  primaryAction?: HeaderAction
  secondaryAction?: HeaderAction
}

function ActionButton({ action }: { action: HeaderAction }) {
  const icon = action.variant === "outline" ? <Compass /> : <ArrowRight />

  return (
    <HoverLift>
      <Button
        asChild
        variant={action.variant ?? "default"}
        className="rounded-full"
      >
        <Link href={action.href}>
          {action.label}
          {icon}
        </Link>
      </Button>
    </HoverLift>
  )
}

export default function Header({
  eyebrow,
  primaryAction,
  secondaryAction,
}: HeaderProps) {
  return (
    <header className="page-shell pb-0">
      <FadeIn y={12}>
        <div className="panel-surface flex flex-col gap-4 rounded-[1.75rem] px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <StaggerGroup
            className="flex items-start gap-4"
            delayChildren={0.05}
            stagger={0.06}
          >
            <StaggerItem y={8}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
            </StaggerItem>

            <div className="space-y-1">
              <StaggerItem y={8}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-heading text-xl font-semibold tracking-tight">
                    SignalLens
                  </p>
                  {eyebrow ? (
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {eyebrow}
                    </Badge>
                  ) : null}
                </div>
              </StaggerItem>
              <StaggerItem y={8}>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Financial document intelligence with graph-based anomaly
                  detection
                </p>
              </StaggerItem>
            </div>
          </StaggerGroup>

          {(primaryAction || secondaryAction) && (
            <StaggerGroup
              className="flex flex-wrap gap-3"
              delayChildren={0.08}
              stagger={0.06}
            >
              {secondaryAction ? (
                <StaggerItem y={8}>
                  <ActionButton action={secondaryAction} />
                </StaggerItem>
              ) : null}
              {primaryAction ? (
                <StaggerItem y={8}>
                  <ActionButton action={primaryAction} />
                </StaggerItem>
              ) : null}
            </StaggerGroup>
          )}
        </div>
      </FadeIn>
    </header>
  )
}
