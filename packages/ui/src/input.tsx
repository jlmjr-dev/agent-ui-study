import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react"

import { cn } from "./cn"

const FIELD =
  "focus-ring w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint disabled:opacity-55"

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, "h-9", className)} {...props} />
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD, "resize-y", className)} {...props} />
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-text">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-text-faint">{hint}</p> : null}
    </div>
  )
}
