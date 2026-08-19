import { useEffect, useId, useRef, useState, type ReactNode } from "react"

import { cn } from "./cn"

export type MenuItem = {
  id: string
  label: string
  icon?: ReactNode
  hint?: string
  danger?: boolean
  disabled?: boolean
  onSelect: () => void
}

export type MenuProps = {
  trigger: (props: {
    onClick: () => void
    "aria-expanded": boolean
    "aria-haspopup": "menu"
    id: string
  }) => ReactNode
  items: MenuItem[]
  align?: "start" | "end"
  className?: string
}

/**
 * A dropdown with real keyboard handling: arrows move, Home and End jump,
 * Escape closes and returns focus to the trigger. Menus that only respond to
 * a click are the most common accessibility gap in a chat interface, where
 * almost every affordance hides behind one.
 */
export function Menu({
  trigger,
  items,
  align = "start",
  className,
}: MenuProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const container = useRef<HTMLDivElement>(null)
  const triggerId = useId()

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  const enabled = items.filter((item) => !item.disabled)

  function move(delta: number) {
    setActive((current) => {
      const next = current + delta
      if (next < 0) return enabled.length - 1
      if (next >= enabled.length) return 0
      return next
    })
  }

  function close() {
    setOpen(false)
    document.getElementById(triggerId)?.focus()
  }

  return (
    <div ref={container} className="relative">
      {trigger({
        id: triggerId,
        onClick: () => {
          setActive(0)
          setOpen((current) => !current)
        },
        "aria-expanded": open,
        "aria-haspopup": "menu",
      })}

      {open ? (
        <div
          role="menu"
          tabIndex={-1}
          ref={(node) => node?.focus()}
          onKeyDown={(event) => {
            if (event.key === "Escape") return close()
            if (event.key === "ArrowDown") {
              event.preventDefault()
              return move(1)
            }
            if (event.key === "ArrowUp") {
              event.preventDefault()
              return move(-1)
            }
            if (event.key === "Home") return setActive(0)
            if (event.key === "End") return setActive(enabled.length - 1)
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              enabled[active]?.onSelect()
              return close()
            }
          }}
          className={cn(
            "absolute z-40 mt-1.5 min-w-52 animate-pop rounded-xl border border-border bg-surface p-1 shadow-xl outline-none",
            align === "end" ? "right-0" : "left-0",
            className
          )}
        >
          {items.map((item) => {
            const index = enabled.indexOf(item)

            return (
              <button
                key={item.id}
                role="menuitem"
                type="button"
                disabled={item.disabled}
                onMouseEnter={() => index >= 0 && setActive(index)}
                onClick={() => {
                  item.onSelect()
                  close()
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
                  "disabled:pointer-events-none disabled:opacity-45",
                  item.danger ? "text-danger" : "text-text",
                  index === active && index >= 0 && "bg-surface-raised"
                )}
              >
                {item.icon ? (
                  <span className="shrink-0 text-text-muted">{item.icon}</span>
                ) : null}
                <span className="flex-1 truncate">{item.label}</span>
                {item.hint ? (
                  <kbd className="font-mono text-[11px] text-text-faint">
                    {item.hint}
                  </kbd>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
