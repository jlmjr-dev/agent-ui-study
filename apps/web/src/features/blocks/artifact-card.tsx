import { Code, FileText, LayoutTemplate } from "lucide-react"
import type { ComponentType } from "react"

import type { ArtifactKind } from "@agent-ui-study/protocol"

const ICONS: Record<ArtifactKind, ComponentType<{ className?: string }>> = {
  markdown: FileText,
  code: Code,
  html: LayoutTemplate,
}

const LABELS: Record<ArtifactKind, string> = {
  markdown: "Document",
  code: "Code",
  html: "Interactive",
}

export type ArtifactCardProps = {
  title: string
  kind: ArtifactKind
  onOpen: () => void
}

/**
 * An artifact is not a tool call, so it does not render as one.
 *
 * As a tool row it read "Created `Tip calculator`  opened  ›  | Open": the
 * title set as if it were a path, a summary word that describes nothing, and
 * two competing hit targets where one opens raw JSON and the other opens the
 * actual thing. Here the whole card is the single target.
 */
export function ArtifactCard({ title, kind, onOpen }: ArtifactCardProps) {
  const Icon = ICONS[kind]

  return (
    <button
      type="button"
      onClick={onOpen}
      className="my-3 flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left focus-ring transition-colors hover:border-border-strong hover:bg-surface-raised"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
        <Icon className="size-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-text">
          {title}
        </span>
        <span className="block text-[12px] text-text-faint">
          {LABELS[kind]} · Click to open
        </span>
      </span>
    </button>
  )
}
