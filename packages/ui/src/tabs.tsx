import type { ReactNode } from "react"

import { cn } from "./cn"

export type TabsProps<T extends string> = {
  value: T
  onChange: (next: T) => void
  options: { value: T; label: string; icon?: ReactNode }[]
  label: string
  className?: string
}

export function Tabs<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg bg-surface-raised p-0.5",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          type="button"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[7px] px-2.5 py-1 text-[13px] font-medium focus-ring transition-colors",
            value === option.value
              ? "bg-surface text-text shadow-sm"
              : "text-text-muted hover:text-text"
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}
