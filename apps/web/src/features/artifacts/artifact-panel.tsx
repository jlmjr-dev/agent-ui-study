import { latestVersion, type Artifact } from "@agent-ui-study/protocol"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  X,
} from "lucide-react"
import { EmptyState, IconButton, Menu, Tabs } from "@agent-ui-study/ui"
import { FileText } from "lucide-react"
import { useState } from "react"

import { formatRelative } from "@/shared/lib/format"
import { useCopy } from "@/shared/hooks/use-copy"

import { ArtifactPreview } from "./artifact-preview"

export type ArtifactPanelProps = {
  /**
   * The list rather than the conversation: the panel opens from a header
   * toggle that is available before a chat exists, and it has an empty state
   * of its own to show for that.
   */
  artifacts: Artifact[]
  artifactId: string | null
  onSelect: (artifactId: string) => void
  onClose: () => void
}

export function ArtifactPanel({
  artifacts,
  artifactId,
  onSelect,
  onClose,
}: ArtifactPanelProps) {
  const [mode, setMode] = useState<"preview" | "source">("preview")
  const { copied, copy } = useCopy()

  const artifact = artifacts.find((entry) => entry.id === artifactId) ?? null

  /**
   * Paging back to an older version is remembered against the artifact and its
   * version count, so a new version arriving mid-run becomes the one on screen
   * rather than leaving the reader on a stale one. Stamping the selection with
   * that key makes it expire on its own, with no effect chasing the props.
   */
  const versionKey = `${artifact?.id}:${artifact?.versions.length}`
  const [selection, setSelection] = useState<{
    key: string
    index: number
  } | null>(null)

  if (!artifact) {
    return (
      <PanelFrame onClose={onClose} title="Artifacts">
        <EmptyState
          icon={<FileText className="size-6" />}
          title="Nothing here yet"
          description="Documents and code the assistant creates open in this panel."
        />
      </PanelFrame>
    )
  }

  const index =
    selection?.key === versionKey
      ? selection.index
      : artifact.versions.length - 1
  const version = artifact.versions[index] ?? latestVersion(artifact)
  const content = version?.content ?? ""

  return (
    <PanelFrame
      onClose={onClose}
      title={artifact.title}
      subtitle={
        version
          ? `Version ${index + 1} of ${artifact.versions.length} · ${formatRelative(version.createdAt)}`
          : undefined
      }
      switcher={
        artifacts.length > 1 ? (
          <Menu
            align="start"
            trigger={(props) => (
              <button
                {...props}
                type="button"
                className="rounded-lg px-1.5 py-1 text-[12px] text-text-faint focus-ring hover:text-text"
              >
                {artifacts.length} artifacts
              </button>
            )}
            items={artifacts.map((entry) => ({
              id: entry.id,
              label: entry.title,
              icon:
                entry.id === artifact.id ? (
                  <Check className="size-3.5 text-accent" />
                ) : (
                  <span className="size-3.5" />
                ),
              onSelect: () => onSelect(entry.id),
            }))}
          />
        ) : null
      }
      actions={
        <>
          {artifact.versions.length > 1 ? (
            <div className="flex items-center gap-0.5 text-[11px] text-text-faint">
              <IconButton
                size="sm"
                label="Previous version"
                disabled={index <= 0}
                onClick={() =>
                  setSelection({ key: versionKey, index: index - 1 })
                }
              >
                <ChevronLeft className="size-3.5" />
              </IconButton>
              <span className="tabular-nums">v{index + 1}</span>
              <IconButton
                size="sm"
                label="Next version"
                disabled={index >= artifact.versions.length - 1}
                onClick={() =>
                  setSelection({ key: versionKey, index: index + 1 })
                }
              >
                <ChevronRight className="size-3.5" />
              </IconButton>
            </div>
          ) : null}

          <Tabs
            label="View"
            value={mode}
            onChange={setMode}
            options={[
              { value: "preview", label: "Preview" },
              { value: "source", label: "Source" },
            ]}
          />

          <IconButton
            size="sm"
            label={copied ? "Copied" : "Copy contents"}
            onClick={() => void copy(content)}
          >
            {copied ? (
              <Check className="size-3.5 text-success" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </IconButton>

          <IconButton
            size="sm"
            label="Save a copy"
            onClick={() => download(artifact, content)}
          >
            <Download className="size-3.5" />
          </IconButton>
        </>
      }
    >
      <ArtifactPreview artifact={artifact} content={content} mode={mode} />
    </PanelFrame>
  )
}

const EXTENSIONS: Record<Artifact["kind"], string> = {
  markdown: "md",
  html: "html",
  code: "txt",
}

function download(artifact: Artifact, content: string) {
  const extension =
    artifact.kind === "code"
      ? (artifact.language ?? "txt")
      : EXTENSIONS[artifact.kind]

  const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }))
  const link = document.createElement("a")

  link.href = url
  link.download = `${artifact.id}.${extension}`
  link.click()

  URL.revokeObjectURL(url)
}

function PanelFrame({
  title,
  subtitle,
  actions,
  switcher,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  switcher?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <aside className="flex h-full min-w-0 flex-col border-l border-border bg-surface">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-text">{title}</p>
          {subtitle ? (
            <p className="truncate text-[11px] text-text-faint">{subtitle}</p>
          ) : null}
        </div>
        {switcher}
        <IconButton size="sm" label="Close panel" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </header>

      {actions ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-1.5">
          {actions}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </aside>
  )
}
