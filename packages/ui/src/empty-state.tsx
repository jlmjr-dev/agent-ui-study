import type { ReactNode } from "react"

import { cn } from "./cn"

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  /** Page-scale callers pass roomier padding; the default fits a sidebar. */
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid place-items-center px-4 py-10 text-center",
        className
      )}
    >
      {icon ? <div className="mb-3 text-text-faint">{icon}</div> : null}
      <p className="text-sm font-medium text-text">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-[13px] text-balance text-text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
