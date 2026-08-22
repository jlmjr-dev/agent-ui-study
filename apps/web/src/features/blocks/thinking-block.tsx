import { Brain, ChevronRight } from "lucide-react"
import { cn } from "@agent-ui-study/ui"
import { useState } from "react"

export type ThinkingBlockProps = {
  text: string
  streaming: boolean
}

/**
 * Open while it is being written, collapsed once the answer starts.
 *
 * That is the behaviour worth copying: reasoning is interesting to watch and
 * noise to re-read, so it folds itself away rather than making the user do it,
 * and it stays open if they deliberately opened it.
 */
export function ThinkingBlock({ text, streaming }: ThinkingBlockProps) {
  // Null means "nobody has decided", so the block follows the stream. Once the
  // reader clicks, their choice wins for good. Deriving it this way means no
  // effect has to chase the streaming flag as it flips.
  const [choice, setChoice] = useState<boolean | null>(null)
  const open = choice ?? streaming

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-border bg-surface-sunken">
      <button
        type="button"
        onClick={() => setChoice(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-text-muted focus-ring transition-colors hover:text-text"
      >
        <Brain
          className={cn("size-3.5 shrink-0", streaming && "animate-pulse")}
        />
        <span className="flex-1 font-medium">
          {streaming ? "Thinking" : "Thought process"}
        </span>
        <ChevronRight
          className={cn("size-3.5 transition-transform", open && "rotate-90")}
        />
      </button>

      {open ? (
        <div className="border-t border-border px-3 py-2.5 text-[13px] leading-6 whitespace-pre-wrap text-text-muted">
          {text}
          {streaming ? <span className="stream-caret" /> : null}
        </div>
      ) : null}
    </div>
  )
}
