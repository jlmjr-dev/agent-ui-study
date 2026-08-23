import type { Conversation } from "@agent-ui-study/protocol"
import { describe, expect, it } from "vitest"

import { groupConversations } from "./group-conversations"

const NOON = new Date("2026-08-20T12:00:00").getTime()
const DAY = 86_400_000

function make(
  id: string,
  updatedAt: number,
  options: { pinned?: boolean; title?: string; text?: string } = {}
): Conversation {
  return {
    id,
    title: options.title ?? id,
    createdAt: updatedAt,
    updatedAt,
    pinned: options.pinned ?? false,
    model: "balanced",
    personaId: null,
    headId: "n1",
    artifacts: [],
    nodes: {
      n1: {
        id: "n1",
        parentId: null,
        role: "user",
        content: [{ type: "text", text: options.text ?? "" }],
        createdAt: updatedAt,
        status: "complete",
      },
    },
  }
}

describe("groupConversations", () => {
  it("buckets by recency", () => {
    const groups = groupConversations(
      [make("a", NOON), make("b", NOON - 3 * DAY)],
      "",
      NOON
    )

    expect(groups.map(([label]) => label)).toEqual(["Today", "Previous 7 days"])
  })

  it("lifts pinned chats out of their date bucket", () => {
    const groups = groupConversations(
      [make("a", NOON, { pinned: true }), make("b", NOON)],
      "",
      NOON
    )

    expect(groups[0][0]).toBe("Pinned")
    expect(groups[0][1].map((entry) => entry.id)).toEqual(["a"])
  })

  it("searches message text, not just the title", () => {
    const groups = groupConversations(
      [make("a", NOON, { title: "Untitled", text: "how is tax computed" })],
      "tax",
      NOON
    )

    expect(groups[0][1]).toHaveLength(1)
  })

  it("returns nothing when a search matches nothing", () => {
    expect(groupConversations([make("a", NOON)], "websockets", NOON)).toEqual(
      []
    )
  })
})
