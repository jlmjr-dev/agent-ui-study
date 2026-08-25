import { cn } from "./cn"

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full focus-ring transition-colors",
        "disabled:pointer-events-none disabled:opacity-50",
        // The off state is this control's only state indicator, so it has to
        // clear 3:1 the same way a boundary does.
        checked ? "bg-accent" : "bg-text-faint"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-surface shadow-sm transition-[left]",
          checked ? "left-4.5" : "left-0.5"
        )}
      />
    </button>
  )
}
