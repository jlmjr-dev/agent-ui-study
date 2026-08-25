import type { ToolResultBlock, ToolUseBlock } from "@agent-ui-study/protocol"
import {
  ChevronRight,
  CircleAlert,
  FileText,
  FolderOpen,
  Globe,
  PenLine,
  Search,
  Terminal,
  Wrench,
} from "lucide-react"
import { Spinner, cn } from "@agent-ui-study/ui"
import { useState, type ComponentType } from "react"

import { describeToolCall, isCodeTarget, summarizeResult } from "./tool-label"

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  read_file: FileText,
  write_file: PenLine,
  list_files: FolderOpen,
  search_files: Search,
  run_command: Terminal,
  web_search: Globe,
  create_artifact: FileText,
}

export type ToolBlockProps = {
  call: ToolUseBlock
  result: ToolResultBlock | null
  onOpenArtifact?: (artifactId: string) => void
}

/**
 * One collapsed line per tool call, expandable to the raw arguments and
 * output. Collapsed is the right default: a run that reads six files should
 * be six quiet lines, not six walls of source, and the reader can still get
 * at everything the model actually saw.
 */
export function ToolBlock({ call, result, onOpenArtifact }: ToolBlockProps) {
  const [open, setOpen] = useState(false)
  const pending = result === null
  const { verb, target } = describeToolCall(call, pending)
  const Icon = ICONS[call.name] ?? Wrench

  const failed = result?.is_error === true
  const summary = summarizeResult(result?.detail)

  const artifactId =
    result?.detail?.kind === "artifact" ? result.detail.artifactId : null

  return (
    <div
      className={cn(
        "my-1.5 overflow-hidden rounded-xl border border-border bg-surface",
        failed && "border-danger/35"
      )}
    >
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-[13px] focus-ring"
        >
          {pending ? (
            <Spinner className="size-3.5" />
          ) : failed ? (
            <CircleAlert className="size-3.5 shrink-0 text-danger" />
          ) : (
            <Icon className="size-3.5 shrink-0 text-text-muted" />
          )}

          <span className="shrink-0 text-text-muted">{verb}</span>
          {target ? (
            <span
              className={cn(
                "truncate text-text",
                // A natural-language query is not code, so it is not set in mono.
                isCodeTarget(call.name)
                  ? "font-mono text-[12px]"
                  : "text-[13px]"
              )}
            >
              {target}
            </span>
          ) : null}

          <span className="flex-1" />

          {summary ? (
            <span className="shrink-0 text-[11px] text-text-faint tabular-nums">
              {summary}
            </span>
          ) : null}

          <ChevronRight
            className={cn(
              "size-3.5 shrink-0 text-text-faint transition-transform",
              open && "rotate-90"
            )}
          />
        </button>

        {artifactId && onOpenArtifact ? (
          <button
            type="button"
            onClick={() => onOpenArtifact(artifactId)}
            className="shrink-0 border-l border-border px-3 py-2 text-[12px] font-medium text-accent focus-ring hover:underline"
          >
            Open
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="grid gap-2 border-t border-border p-3">
          <Section label="Input">{JSON.stringify(call.input, null, 2)}</Section>
          {result ? (
            <Section
              label={failed ? "Error" : "Output"}
              tone={failed ? "danger" : undefined}
            >
              {result.content}
            </Section>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function Section({
  label,
  tone,
  children,
}: {
  label: string
  tone?: "danger"
  children: string
}) {
  return (
    <div className="grid gap-1">
      <span className="text-[11px] font-medium tracking-wide text-text-faint uppercase">
        {label}
      </span>
      <pre
        className={cn(
          "max-h-72 overflow-auto rounded-lg bg-surface-sunken p-2.5 font-mono text-[12px] leading-relaxed whitespace-pre-wrap",
          tone === "danger" ? "text-danger" : "text-text-muted"
        )}
      >
        {children}
      </pre>
    </div>
  )
}
