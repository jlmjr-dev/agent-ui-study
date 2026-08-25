import type { ButtonHTMLAttributes, ReactNode } from "react"

import { cn } from "./cn"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
export type ButtonSize = "sm" | "md" | "lg"

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent-hover disabled:bg-accent/50",
  secondary:
    "border border-border bg-surface text-text hover:bg-surface-raised hover:border-border-strong",
  // A transparent border, so a ghost button and a bordered one in the same
  // column put their icons on the same rail.
  ghost:
    "border border-transparent text-text-muted hover:bg-surface-raised hover:text-text",
  danger: "bg-danger text-white hover:brightness-110",
}

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-2.5 text-[13px]",
  md: "h-9 gap-2 rounded-lg px-3 text-sm",
  lg: "h-11 gap-2 rounded-xl px-5 text-[15px]",
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Leading element, usually an icon. */
  icon?: ReactNode
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-medium focus-ring transition-colors",
        "disabled:pointer-events-none disabled:opacity-55",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
