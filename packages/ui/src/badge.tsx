import type { ReactNode } from "react"

import { cn } from "./cn"

export type BadgeTone = "neutral" | "accent" | "danger" | "success"

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-raised text-text-muted",
  accent: "bg-accent-soft text-accent",
  danger: "bg-danger/12 text-danger",
  success: "bg-success/12 text-success",
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
