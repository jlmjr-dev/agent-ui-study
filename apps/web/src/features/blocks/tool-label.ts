import type { ToolDetail, ToolUseBlock } from "@agent-ui-study/protocol"

/**
 * Tool cards read as a sentence rather than as a function signature. A card
 * that says `read_file({"path":"src/cart.ts"})` makes the reader parse JSON;
 * one that says "Read src/cart.ts" does not.
 */
/**
 * Verbs come in pairs. A call that is still in flight reading "Wrote
 * src/cart.ts" asserts a write that has not returned yet, and a spinner
 * beside it is not enough to reverse a past-tense sentence.
 */
const VERBS: Record<string, readonly [pending: string, done: string]> = {
  read_file: ["Reading", "Read"],
  write_file: ["Writing", "Wrote"],
  list_files: ["Listing", "Listed"],
  search_files: ["Searching for", "Searched for"],
  run_command: ["Running", "Ran"],
  web_search: ["Searching the web for", "Searched the web for"],
  create_artifact: ["Creating", "Created"],
  set_todos: ["Updating the plan", "Updated the plan"],
}

/** Tools whose argument is a path or a command, and so reads as code. */
const MONO_TARGETS = new Set([
  "read_file",
  "write_file",
  "list_files",
  "run_command",
])

export function isCodeTarget(name: string): boolean {
  return MONO_TARGETS.has(name)
}

export function describeToolCall(
  block: ToolUseBlock,
  pending = false
): { verb: string; target: string } {
  const input = block.input
  const text = (key: string) =>
    typeof input[key] === "string" ? (input[key] as string) : ""

  const verb = VERBS[block.name]?.[pending ? 0 : 1] ?? block.name

  switch (block.name) {
    case "read_file":
    case "write_file":
      return { verb, target: text("path") }
    case "list_files":
      return { verb, target: text("path") || "the workspace" }
    case "search_files":
    case "web_search":
      return { verb, target: text("query") }
    case "run_command":
      return { verb, target: text("command") }
    case "create_artifact":
      return { verb, target: text("title") }
    case "set_todos":
      return { verb, target: "" }
    default:
      return { verb, target: "" }
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
