import { SCENARIOS } from "@agent-ui-study/engine"
import { ArrowUpRight } from "lucide-react"

import { Wordmark } from "@/shared/components/wordmark"

/**
 * The suggestions are the scripted scenarios themselves, read straight from
 * the engine. A demo that offers prompts it cannot answer is worse than one
 * that offers none, and this cannot drift out of sync with what actually runs.
 */
export function Welcome({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl animate-rise flex-col items-center px-4 py-10">
      <Wordmark className="mb-3 size-9" />

      <h1 className="text-2xl font-semibold tracking-tight text-text">
        What are we working on?
      </h1>
      <p className="mt-2 max-w-md text-center text-[14px] text-balance text-text-muted">
        This build answers from scripted conversations. Everything below runs
        end to end, tools included.
      </p>

      <div className="mt-7 grid w-full gap-2 sm:grid-cols-2">
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => onPick(scenario.prompt)}
            className="group flex items-start gap-2 rounded-xl border border-border bg-surface p-3 text-left focus-ring transition-colors hover:border-border-strong hover:bg-surface-raised"
          >
            <span className="flex-1 text-[13px] leading-6 text-text">
              {scenario.prompt}
            </span>
            <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-text-faint transition-colors group-hover:text-accent" />
          </button>
        ))}
      </div>
    </div>
  )
}
