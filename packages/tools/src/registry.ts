import type { ArtifactKind, ToolOutcome } from "@agent-ui-study/protocol"

import { runCommand } from "./commands"
import { findDefinition } from "./definitions"
import type { VirtualFileSystem } from "./filesystem"
import { searchWeb } from "./web"

export type ArtifactDraft = {
  id: string
  title: string
  kind: ArtifactKind
  language: string | null
  content: string
}

export type TodoItem = {
  text: string
  done: boolean
}

/**
 * What a tool is allowed to touch. Passing the sinks in rather than importing
 * a store keeps the registry pure enough to test, and keeps the packages below
 * the app unaware that a React tree exists.
 */
export type ToolContext = {
  fs: VirtualFileSystem
  onArtifact?: (artifact: ArtifactDraft) => void
  onTodos?: (items: TodoItem[]) => void
}

function fail(message: string): ToolOutcome {
  return { content: message, isError: true }
}

function readString(
  input: Record<string, unknown>,
  key: string
): string | undefined {
  const value = input[key]

  return typeof value === "string" ? value : undefined
}

function readInteger(
  input: Record<string, unknown>,
  key: string
): number | undefined {
  const value = input[key]

  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : undefined
}

export function executeTool(
  name: string,
  input: Record<string, unknown>,
  context: ToolContext
): ToolOutcome {
  if (!findDefinition(name)) {
    return fail(`No tool named ${name} is available.`)
  }

  const { fs } = context

  switch (name) {
    case "list_files": {
      const path = readString(input, "path") ?? ""
      const entries = fs.list(path)

      if (entries.length === 0) {
        return fail(`${path || "/"} is empty or does not exist.`)
      }

      return {
        content: entries
          .map((entry) => (entry.isDirectory ? `${entry.name}/` : entry.name))
          .join("\n"),
        isError: false,
        detail: {
          kind: "listing",
          path: path || "/",
          entries: entries.map((entry) =>
            entry.isDirectory ? `${entry.name}/` : entry.name
          ),
        },
      }
    }

    case "read_file": {
      const path = readString(input, "path")
      if (!path) return fail("read_file needs a path.")

      const content = fs.read(path)
      if (content === null) return fail(`${path} does not exist.`)

      const offset = readInteger(input, "offset")
      const limit = readInteger(input, "limit")

      if (offset === undefined && limit === undefined) {
        return { content, isError: false }
      }

      const start = Math.max(0, (offset ?? 1) - 1)
      const lines = content.split("\n")

      return {
        content: lines
          .slice(start, limit ? start + limit : undefined)
          .join("\n"),
        isError: false,
      }
    }

    case "write_file": {
      const path = readString(input, "path")
      const content = readString(input, "content")

      if (!path || content === undefined) {
        return fail("write_file needs a path and content.")
      }

      const before = fs.read(path)
      fs.write(path, content)

      const beforeLines = before === null ? [] : before.split("\n")
      const afterLines = content.split("\n")
      const kept = beforeLines.filter((line) =>
        afterLines.includes(line)
      ).length

      return {
        content:
          before === null
            ? `Created ${path} (${afterLines.length} lines).`
            : `Updated ${path}.`,
        isError: false,
        detail: {
          kind: "diff",
          path,
          added: afterLines.length - kept,
          removed: beforeLines.length - kept,
        },
      }
    }

    case "search_files": {
      const query = readString(input, "query")
      if (!query) return fail("search_files needs a query.")

      const matches = fs.grep(query, readString(input, "glob"))

      return {
        content:
          matches.length === 0
            ? `No matches for ${query}.`
            : matches
                .map((match) => `${match.path}:${match.line}: ${match.text}`)
                .join("\n"),
        isError: false,
        detail: { kind: "matches", query, count: matches.length },
      }
    }

    case "run_command": {
      const command = readString(input, "command")
      if (!command) return fail("run_command needs a command.")

      const result = runCommand(fs, command)

      return {
        content: result.stdout,
        isError: result.exitCode !== 0,
        detail: { kind: "command", command, exitCode: result.exitCode },
      }
    }

    case "web_search": {
      const query = readString(input, "query")
      if (!query) return fail("web_search needs a query.")

      const results = searchWeb(query)

      return {
        content:
          results.length === 0
            ? `No results for ${query}.`
            : results
                .map(
                  (result) =>
                    `${result.title}\n${result.url}\n${result.snippet}`
                )
                .join("\n\n"),
        isError: false,
        detail: { kind: "matches", query, count: results.length },
      }
    }

    case "create_artifact": {
      const id = readString(input, "id")
      const title = readString(input, "title")
      const kind = readString(input, "kind")
      const content = readString(input, "content")

      if (!id || !title || !kind || content === undefined) {
        return fail("create_artifact needs an id, a title, a kind and content.")
      }

      if (kind !== "markdown" && kind !== "code" && kind !== "html") {
        return fail(`${kind} is not a kind of artifact.`)
      }

      context.onArtifact?.({
        id,
        title,
        kind,
        language: readString(input, "language") ?? null,
        content,
      })

      return {
        content: `Opened "${title}" in the side panel.`,
        isError: false,
        detail: { kind: "artifact", artifactId: id, title },
      }
    }

    case "set_todos": {
      const raw = input.items

      if (!Array.isArray(raw)) return fail("set_todos needs an array of items.")

      const items: TodoItem[] = raw.flatMap((entry) => {
        if (typeof entry === "string") return [{ text: entry, done: false }]

        if (entry && typeof entry === "object") {
          const record = entry as Record<string, unknown>
          const text = readString(record, "text")

          if (text) return [{ text, done: record.done === true }]
        }

        return []
      })

      context.onTodos?.(items)

      const done = items.filter((item) => item.done).length

      return {
        content: `Plan updated: ${done} of ${items.length} done.`,
        isError: false,
        detail: { kind: "todos", items },
      }
    }

    default:
      return fail(`${name} is defined but not implemented.`)
  }
}
