import { activePath, branchIndexOf } from "@agent-ui-study/protocol"
import { describe, expect, it } from "vitest"

import {
  addAssistantPlaceholder,
  addUserMessage,
  createConversation,
  deleteSubtree,
  editUserMessage,
  regenerateFrom,
  switchBranch,
  updateNode,
  upsertArtifact,
} from "./actions"

function withTurns(count: number) {
  let conversation = createConversation()
  const ids: string[] = []

  for (let index = 0; index < count; index += 1) {
    const user = addUserMessage(conversation, `question ${index}`)
    conversation = user.conversation
    ids.push(user.node.id)

    const assistant = addAssistantPlaceholder(conversation, "balanced")
    conversation = updateNode(assistant.conversation, assistant.node.id, {
      status: "complete",
      content: [{ type: "text", text: `answer ${index}` }],
    })
    ids.push(assistant.node.id)
  }

  return { conversation, ids }
}

describe("addUserMessage", () => {
  it("titles the conversation from the first prompt only", () => {
    const first = addUserMessage(createConversation(), "Fix the cart total")
    const second = addUserMessage(first.conversation, "And the tax too")

    expect(second.conversation.title).toBe("Fix the cart total")
  })
})

describe("editUserMessage", () => {
  it("forks instead of overwriting", () => {
    const { conversation, ids } = withTurns(1)
    const edited = editUserMessage(conversation, ids[0], "a better question")

    expect(edited).not.toBeNull()
    expect(conversation.nodes[ids[0]].content).toEqual([
      { type: "text", text: "question 0" },
    ])
    expect(branchIndexOf(edited!.conversation, edited!.node.id)).toEqual({
      index: 1,
      total: 2,
    })
  })

  it("moves the visible path onto the new version", () => {
    const { conversation, ids } = withTurns(1)
    const edited = editUserMessage(conversation, ids[0], "a better question")!

    expect(activePath(edited.conversation).map((node) => node.id)).toEqual([
      edited.node.id,
    ])
  })

  it("carries the attachments across", () => {
    const attachment = {
      id: "att_1",
      name: "notes.txt",
      mediaType: "text/plain",
      bytes: 10,
      text: "hello",
    }

    const base = addUserMessage(createConversation(), "look at this", [
      attachment,
    ])
    const edited = editUserMessage(
      base.conversation,
      base.node.id,
      "look again"
    )!

    expect(edited.node.attachments).toEqual([attachment])
  })

  it("refuses to fork an assistant message", () => {
    const { conversation, ids } = withTurns(1)

    expect(editUserMessage(conversation, ids[1], "nope")).toBeNull()
  })
})

describe("regenerateFrom", () => {
  it("adds a sibling reply under the same prompt", () => {
    const { conversation, ids } = withTurns(1)
    const again = regenerateFrom(conversation, ids[1], "deep")!

    expect(again.node.parentId).toBe(ids[0])
    expect(branchIndexOf(again.conversation, again.node.id)).toEqual({
      index: 1,
      total: 2,
    })
  })
})

describe("switchBranch", () => {
  it("lands on the deepest leaf of the branch it moves to", () => {
    // Two turns, then rewind and ask something else, then come back.
    const { conversation, ids } = withTurns(2)
    const forked = editUserMessage(conversation, ids[0], "different question")!

    const back = switchBranch(forked.conversation, ids[0])

    expect(activePath(back).map((node) => node.id)).toEqual(ids)
  })

  it("ignores a node that is no longer there", () => {
    const { conversation } = withTurns(1)

    expect(switchBranch(conversation, "msg_gone")).toBe(conversation)
  })
})

describe("deleteSubtree", () => {
  it("removes the node and everything under it", () => {
    const { conversation, ids } = withTurns(2)
    const pruned = deleteSubtree(conversation, ids[2])

    expect(Object.keys(pruned.nodes)).toEqual(ids.slice(0, 2))
    expect(pruned.headId).toBe(ids[1])
  })
})

describe("upsertArtifact", () => {
  const draft = {
    id: "guide",
    title: "Guide",
    kind: "markdown" as const,
    language: null,
    content: "# One",
  }

  it("keeps each edit as a version", () => {
    const first = upsertArtifact(createConversation(), draft, "msg_1")
    const second = upsertArtifact(
      first,
      { ...draft, content: "# Two" },
      "msg_2"
    )

    expect(second.artifacts).toHaveLength(1)
    expect(
      second.artifacts[0].versions.map((version) => version.content)
    ).toEqual(["# One", "# Two"])
  })

  it("does not record a version when the body is unchanged", () => {
    const first = upsertArtifact(createConversation(), draft, "msg_1")
    const again = upsertArtifact(first, draft, "msg_2")

    expect(again.artifacts[0].versions).toHaveLength(1)
  })
})
