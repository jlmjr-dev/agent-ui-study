import type { ButtonHTMLAttributes, ReactNode } from "react"

import { cn } from "./cn"

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Icon buttons carry no text, so the label is not optional. */
  label: string
  children: ReactNode
  size?: "sm" | "md"
  active?: boolean
}

export function IconButton({
  label,
  children,
  className,
  size = "md",
  active = false,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={props.onClick && active ? true : undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg focus-ring transition-colors",
        "text-text-muted hover:bg-surface-raised hover:text-text",
        "disabled:pointer-events-none disabled:opacity-45",
        active && "bg-surface-raised text-text",
        size === "sm" ? "size-7" : "size-8",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
