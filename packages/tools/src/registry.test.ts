import { beforeEach, describe, expect, it } from "vitest"

import { createFileSystem } from "./filesystem"
import type { ArtifactDraft, TodoItem, ToolContext } from "./registry"
import { executeTool } from "./registry"

describe("executeTool", () => {
  let context: ToolContext
  let artifacts: ArtifactDraft[]
  let todos: TodoItem[][]

  beforeEach(() => {
    artifacts = []
    todos = []
    context = {
      fs: createFileSystem({
        "src/cart.ts": "export function total() {\n  return 0\n}\n",
        "src/cart.test.ts": "it('adds up', () => {})\n",
      }),
      onArtifact: (artifact) => artifacts.push(artifact),
      onTodos: (items) => todos.push(items),
    }
  })

  it("refuses a tool that is not on the surface", () => {
    const result = executeTool("delete_everything", {}, context)

    expect(result.isError).toBe(true)
    expect(result.content).toContain("No tool named")
  })

  it("reads a file whole", () => {
    const result = executeTool("read_file", { path: "src/cart.ts" }, context)

    expect(result.isError).toBe(false)
    expect(result.content).toContain("export function total")
  })

  it("reports a missing file as an error rather than empty content", () => {
    const result = executeTool("read_file", { path: "src/nope.ts" }, context)

    expect(result.isError).toBe(true)
    expect(result.content).toContain("does not exist")
  })

  it("slices a read with a one-based offset", () => {
    const result = executeTool(
      "read_file",
      { path: "src/cart.ts", offset: 2, limit: 1 },
      context
    )

    expect(result.content).toBe("  return 0")
  })

  it("counts the lines a write changed", () => {
    const result = executeTool(
      "write_file",
      {
        path: "src/cart.ts",
        content: "export function total() {\n  return 1\n}\n",
      },
      context
    )

    expect(result.detail).toEqual({
      kind: "diff",
      path: "src/cart.ts",
      added: 1,
      removed: 1,
    })
    expect(context.fs.read("src/cart.ts")).toContain("return 1")
  })

  it("treats a search with no hits as a result, not a failure", () => {
    const result = executeTool("search_files", { query: "websocket" }, context)

    expect(result.isError).toBe(false)
    expect(result.detail).toEqual({
      kind: "matches",
      query: "websocket",
      count: 0,
    })
  })

  it("marks a rejected command as an error", () => {
    const result = executeTool("run_command", { command: "rm -rf /" }, context)

    expect(result.isError).toBe(true)
    expect(result.detail).toMatchObject({ kind: "command", exitCode: 127 })
  })

  it("counts the real test cases when the suite runs", () => {
    const result = executeTool("run_command", { command: "pnpm test" }, context)

    expect(result.isError).toBe(false)
    expect(result.content).toContain("1 passed (1)")
  })

  it("hands a created artifact to the sink", () => {
    executeTool(
      "create_artifact",
      { id: "notes", title: "Notes", kind: "markdown", content: "# Hi" },
      context
    )

    expect(artifacts).toEqual([
      {
        id: "notes",
        title: "Notes",
        kind: "markdown",
        language: null,
        content: "# Hi",
      },
    ])
  })

  it("rejects an artifact kind it cannot render", () => {
    const result = executeTool(
      "create_artifact",
      { id: "x", title: "X", kind: "spreadsheet", content: "" },
      context
    )

    expect(result.isError).toBe(true)
    expect(artifacts).toHaveLength(0)
  })

  it("accepts todos as plain strings or as objects", () => {
    executeTool(
      "set_todos",
      { items: ["read the code", { text: "fix it", done: true }] },
      context
    )

    expect(todos[0]).toEqual([
      { text: "read the code", done: false },
      { text: "fix it", done: true },
    ])
  })
})
