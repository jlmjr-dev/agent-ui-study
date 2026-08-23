import { ChevronRight, File, Folder, X } from "lucide-react"
import { IconButton, cn } from "@agent-ui-study/ui"
import { useMemo, useState } from "react"

import { CodeBlock } from "@/features/markdown/code-block"
import { useStore } from "@/services/store-context"

import { buildTree } from "./build-tree"

const EXTENSION_LANGUAGES: Record<string, string> = {
  ts: "ts",
  tsx: "ts",
  js: "js",
  json: "json",
  md: "markdown",
  css: "css",
  html: "html",
  sh: "bash",
}

/**
 * The files the tools are actually reading and writing.
 *
 * Without this the workspace is a claim; with it a reader can open `cart.ts`
 * after a run and see the line that changed. It is the cheapest way to make a
 * simulated tool surface believable.
 */
export function WorkspacePanel({ onClose }: { onClose: () => void }) {
  const { workspace, workspaceVersion } = useStore()
  const [selected, setSelected] = useState<string | null>("src/cart.ts")
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const tree = useMemo(
    () => buildTree(workspace.paths()),
    // The filesystem mutates in place, so the version counter is the signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspace, workspaceVersion]
  )

  const content = selected ? workspace.read(selected) : null
  const extension = selected?.split(".").pop() ?? ""

  return (
    <aside className="flex h-full min-w-0 flex-col border-l border-border bg-surface">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <p className="flex-1 text-[13px] font-medium text-text">Workspace</p>
        <span className="text-[11px] text-text-faint tabular-nums">
          {workspace.paths().length} files
        </span>
        <IconButton size="sm" label="Close panel" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </header>

      <div className="max-h-56 shrink-0 overflow-y-auto border-b border-border p-1.5">
        {tree.map((entry) => {
          const hidden = [...collapsed].some((prefix) =>
            entry.path.startsWith(`${prefix}/`)
          )
          if (hidden) return null

          return (
            <button
              key={entry.path}
              type="button"
              onClick={() => {
                if (entry.isDirectory) {
                  setCollapsed((current) => {
                    const next = new Set(current)
                    if (next.has(entry.path)) next.delete(entry.path)
                    else next.add(entry.path)

                    return next
                  })
                } else {
                  setSelected(entry.path)
                }
              }}
              style={{ paddingLeft: `${entry.depth * 12 + 6}px` }}
              className={cn(
                "flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-[12px] focus-ring transition-colors",
                selected === entry.path
                  ? "bg-accent-soft text-text"
                  : "text-text-muted hover:bg-surface-raised"
              )}
            >
              {entry.isDirectory ? (
                <>
                  <ChevronRight
                    className={cn(
                      "size-3 shrink-0 transition-transform",
                      !collapsed.has(entry.path) && "rotate-90"
                    )}
                  />
                  <Folder className="size-3 shrink-0" />
                </>
              ) : (
                <>
                  <span className="size-3 shrink-0" />
                  <File className="size-3 shrink-0" />
                </>
              )}
              <span className="truncate font-mono">{entry.name}</span>
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {content === null ? (
          <p className="p-4 text-[13px] text-text-faint">
            Pick a file to read it.
          </p>
        ) : (
          <div className="p-3">
            <p className="mb-2 font-mono text-[11px] text-text-faint">
              {selected}
            </p>
            <CodeBlock
              code={content}
              language={EXTENSION_LANGUAGES[extension] ?? null}
              className="my-0"
            />
          </div>
        )}
      </div>
    </aside>
  )
}
