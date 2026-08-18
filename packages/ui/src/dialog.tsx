import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

import { cn } from "./cn"
import { IconButton } from "./icon-button"

export type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

/**
 * One component, two shapes. A pointer screen gets a centered panel it can
 * click around; a phone gets a sheet that rises from the bottom edge within
 * thumb reach. The split is done in CSS rather than by branching on a media
 * query in JavaScript, so there is no flash of the wrong layout on first paint.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const previous = document.activeElement as HTMLElement | null

    const focusable = panel.current?.querySelector<HTMLElement>(
      "[data-autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    )
    focusable?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation()
        onClose()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
      previous?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="absolute inset-0 animate-fade bg-black/45 backdrop-blur-[2px]" />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex max-h-[88vh] w-full flex-col border border-border bg-surface shadow-2xl",
          "animate-sheet rounded-t-2xl sm:max-w-lg sm:animate-pop sm:rounded-2xl",
          className
        )}
      >
        <header className="flex items-start gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-text">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-[13px] text-text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          {children}
        </div>

        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body
  )
}
