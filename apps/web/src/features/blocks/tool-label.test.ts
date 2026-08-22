import { describe, expect, it } from "vitest"

import { describeToolCall, summarizeResult } from "./tool-label"

const call = (name: string, input: Record<string, unknown>) => ({
  type: "tool_use" as const,
  id: "toolu_1",
  name,
  input,
})

describe("describeToolCall", () => {
  it("reads as a sentence", () => {
    expect(
      describeToolCall(call("read_file", { path: "src/cart.ts" }))
    ).toEqual({
      verb: "Read",
      target: "src/cart.ts",
    })
  })

  it("names the workspace when a listing has no path", () => {
    expect(describeToolCall(call("list_files", {})).target).toBe(
      "the workspace"
    )
  })

  it("survives arguments that are still streaming in", () => {
    // Mid-stream the input object is empty until its json finishes parsing.
    expect(describeToolCall(call("read_file", {}))).toEqual({
      verb: "Read",
      target: "",
    })
  })

  it("falls back to the tool name for a tool it has no phrasing for", () => {
    expect(describeToolCall(call("some_new_tool", {})).verb).toBe(
      "some_new_tool"
    )
  })
})

describe("summarizeResult", () => {
  it("summarizes a write as a diff stat", () => {
    expect(
      summarizeResult({ kind: "diff", path: "a.ts", added: 2, removed: 1 })
    ).toBe("+2 -1")
  })

  it("says so when a write changed nothing", () => {
    expect(
      summarizeResult({ kind: "diff", path: "a.ts", added: 0, removed: 0 })
    ).toBe("no change")
  })

  it("makes a single match singular", () => {
    expect(summarizeResult({ kind: "matches", query: "x", count: 1 })).toBe(
      "1 match"
    )
  })

  it("has nothing to say about a call with no detail", () => {
    expect(summarizeResult(undefined)).toBeNull()
  })
})
