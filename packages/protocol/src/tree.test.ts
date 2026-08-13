import { describe, expect, it } from "vitest"

import type { Conversation } from "./conversation"
import type { MessageNode } from "./message"
import { activePath, branchIndexOf, deepestLeaf, descendantsOf } from "./tree"

type Spec = [id: string, parentId: string | null, at: number]

function build(specs: Spec[], headId: string | null): Conversation {
  const nodes: Record<string, MessageNode> = {}

  for (const [id, parentId, at] of specs) {
    nodes[id] = {
      id,
      parentId,
      role: id.startsWith("u") ? "user" : "assistant",
      content: [{ type: "text", text: id }],
      createdAt: at,
      status: "complete",
    }
  }

  return {
    id: "conv_1",
    title: "test",
    createdAt: 0,
    updatedAt: 0,
    pinned: false,
    model: "balanced",
    personaId: null,
    nodes,
    headId,
    artifacts: [],
  }
}

describe("the conversation tree", () => {
  it("reads the active path oldest first", () => {
    const conversation = build(
      [
        ["u1", null, 1],
        ["a1", "u1", 2],
        ["u2", "a1", 3],
        ["a2", "u2", 4],
      ],
      "a2"
    )

    expect(activePath(conversation).map((node) => node.id)).toEqual([
      "u1",
      "a1",
      "u2",
      "a2",
    ])
  })

  it("leaves the other branch out of the path", () => {
    const conversation = build(
      [
        ["u1", null, 1],
        ["a1", "u1", 2],
        ["a1b", "u1", 3],
      ],
      "a1"
    )

    expect(activePath(conversation).map((node) => node.id)).toEqual([
      "u1",
      "a1",
    ])
  })

  it("numbers a regenerated reply among its siblings", () => {
    const conversation = build(
      [
        ["u1", null, 1],
        ["a1", "u1", 2],
        ["a1b", "u1", 3],
        ["a1c", "u1", 4],
      ],
      "a1b"
    )

    expect(branchIndexOf(conversation, "a1b")).toEqual({ index: 1, total: 3 })
  })

  it("follows a sibling down to its newest leaf", () => {
    const conversation = build(
      [
        ["u1", null, 1],
        ["a1", "u1", 2],
        ["a1b", "u1", 3],
        ["u2", "a1b", 4],
        ["a2", "u2", 5],
      ],
      "a1"
    )

    // Switching to a1b must land on a2, not on a1b itself, or the two turns
    // underneath it disappear from the transcript.
    expect(deepestLeaf(conversation, "a1b")).toBe("a2")
  })

  it("stops walking a path that loops back on itself", () => {
    const conversation = build(
      [
        ["u1", "a1", 1],
        ["a1", "u1", 2],
      ],
      "a1"
    )

    expect(activePath(conversation)).toHaveLength(2)
    expect(deepestLeaf(conversation, "u1")).toBeTypeOf("string")
  })

  it("collects a subtree for deletion", () => {
    const conversation = build(
      [
        ["u1", null, 1],
        ["a1", "u1", 2],
        ["u2", "a1", 3],
        ["a2", "u2", 4],
      ],
      "a2"
    )

    expect(descendantsOf(conversation, "a1").sort()).toEqual(["a1", "a2", "u2"])
  })
})
