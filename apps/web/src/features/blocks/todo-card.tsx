import { Check, ListChecks } from "lucide-react"
import { cn } from "@agent-ui-study/ui"

export type TodoCardProps = {
  items: { text: string; done: boolean }[]
}

/**
 * The plan, rendered as a checklist rather than as the tool's text output.
 * A visible plan is what makes a long agent run legible: it says what is left
 * without the user having to read the transcript to work it out.
 */
export function TodoCard({ items }: TodoCardProps) {
  if (items.length === 0) return null

  const done = items.filter((item) => item.done).length

  return (
    <div className="my-2 rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-text-muted">
        <ListChecks className="size-3.5" />
        <span className="flex-1">Plan</span>
        <span className="text-text-faint tabular-nums">
          {done} / {items.length}
        </span>
      </div>

      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-[13px]">
            <span
              className={cn(
                "mt-0.5 grid size-4 shrink-0 place-items-center rounded-[5px] border transition-colors",
                item.done
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border-strong"
              )}
            >
              {item.done ? <Check className="size-3" strokeWidth={3} /> : null}
            </span>
            <span
              className={cn(
                item.done ? "text-text-faint line-through" : "text-text"
              )}
            >
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
