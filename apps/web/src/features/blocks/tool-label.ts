import type { ToolDetail, ToolUseBlock } from "@agent-ui-study/protocol"

/**
 * Tool cards read as a sentence rather than as a function signature. A card
 * that says `read_file({"path":"src/cart.ts"})` makes the reader parse JSON;
 * one that says "Read src/cart.ts" does not.
 */
export function describeToolCall(block: ToolUseBlock): {
  verb: string
  target: string
} {
  const input = block.input
  const text = (key: string) =>
    typeof input[key] === "string" ? (input[key] as string) : ""

  switch (block.name) {
    case "read_file":
      return { verb: "Read", target: text("path") }
    case "write_file":
      return { verb: "Wrote", target: text("path") }
    case "list_files":
      return { verb: "Listed", target: text("path") || "the workspace" }
    case "search_files":
      return { verb: "Searched for", target: text("query") }
    case "run_command":
      return { verb: "Ran", target: text("command") }
    case "web_search":
      return { verb: "Searched the web for", target: text("query") }
    case "create_artifact":
      return { verb: "Created", target: text("title") }
    case "set_todos":
      return { verb: "Updated the plan", target: "" }
    default:
      return { verb: block.name, target: "" }
  }
}

/** A short right-aligned summary of what a finished call produced. */
export function summarizeResult(detail: ToolDetail | undefined): string | null {
  if (!detail) return null

  switch (detail.kind) {
    case "diff": {
      const parts: string[] = []
      if (detail.added > 0) parts.push(`+${detail.added}`)
      if (detail.removed > 0) parts.push(`-${detail.removed}`)

      return parts.join(" ") || "no change"
    }
    case "listing":
      return `${detail.entries.length} entries`
    case "matches":
      return detail.count === 1 ? "1 match" : `${detail.count} matches`
    case "command":
      return detail.exitCode === 0 ? "exit 0" : `exit ${detail.exitCode}`
    case "artifact":
      return "opened"
    case "todos":
      return `${detail.items.filter((item) => item.done).length} / ${detail.items.length}`
  }
}
