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
      // Omitting the attribute when false would announce a toggle as a plain
      // button, so a toggle reports both of its states or neither.
      aria-pressed={props.onClick ? active : undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg focus-ring transition-colors",
        "text-text-muted hover:bg-surface-raised hover:text-text",
        "disabled:pointer-events-none disabled:opacity-45",
        active && "bg-surface-raised text-text",
        size === "sm" ? "size-7 max-md:size-11" : "size-8 max-md:size-11",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
