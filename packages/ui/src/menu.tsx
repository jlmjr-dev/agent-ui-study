import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

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
type Position = { top: number; left: number }

export function Menu({
  trigger,
  items,
  align = "start",
  className,
}: MenuProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState<Position | null>(null)
  const container = useRef<HTMLDivElement>(null)
  const popup = useRef<HTMLDivElement | null>(null)
  const triggerId = useId()

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      const inTrigger = container.current?.contains(event.target as Node)
      const inPopup = popup.current?.contains(event.target as Node)

      if (!inTrigger && !inPopup) setOpen(false)
    }

    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  /**
   * The popup renders in a portal because an absolutely positioned element
   * does not escape an ancestor's `overflow`, and its most common home here is
   * a row inside the sidebar's scrolling list: any conversation near the
   * bottom had its Pin and Delete sliced off. Portalling means measuring, so
   * it also flips above the trigger when there is no room below.
   */
  useLayoutEffect(() => {
    if (!open) return

    function place() {
      const anchor = container.current?.getBoundingClientRect()
      if (!anchor) return

      const height = popup.current?.offsetHeight ?? 0
      const width = popup.current?.offsetWidth ?? 0
      const flipped = anchor.bottom + height + 8 > window.innerHeight

      setPosition({
        top: flipped ? anchor.top - height - 6 : anchor.bottom + 6,
        left:
          align === "end"
            ? Math.max(8, anchor.right - width)
            : Math.min(anchor.left, window.innerWidth - width - 8),
      })
    }

    place()
    window.addEventListener("resize", place)
    window.addEventListener("scroll", place, true)

    return () => {
      window.removeEventListener("resize", place)
      window.removeEventListener("scroll", place, true)
    }
  }, [open, align, items.length])

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

      {open
        ? createPortal(
            <div
              role="menu"
              tabIndex={-1}
              ref={(node) => {
                popup.current = node
                node?.focus()
              }}
              style={
                position
                  ? { top: position.top, left: position.left }
                  : { opacity: 0, top: 0, left: 0 }
              }
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
                      <span className="shrink-0 text-text-muted">
                        {item.icon}
                      </span>
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
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
