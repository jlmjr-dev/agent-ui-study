import {
  createId,
  deepestLeaf,
  descendantsOf,
  DEFAULT_MODEL,
  type Artifact,
  type Attachment,
  type ContentBlock,
  type Conversation,
  type MessageNode,
  type ModelId,
} from "@agent-ui-study/protocol"

import { titleFromPrompt } from "@/shared/lib/titles"

/**
 * Every mutation is a pure function from a conversation to a new one. Keeping
 * them here rather than inside the provider means the branching rules, which
 * are the fiddly part, can be tested without rendering anything.
 */

export function createConversation(
  model: ModelId = DEFAULT_MODEL
): Conversation {
  const now = Date.now()

  return {
    id: createId("conv"),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    pinned: false,
    model,
    personaId: null,
    nodes: {},
    headId: null,
    artifacts: [],
  }
}

function touch(conversation: Conversation): Conversation {
  return { ...conversation, updatedAt: Date.now() }
}

export function addUserMessage(
  conversation: Conversation,
  text: string,
  attachments: Attachment[] = []
): { conversation: Conversation; node: MessageNode } {
  const node: MessageNode = {
    id: createId("msg"),
    parentId: conversation.headId,
    role: "user",
    content: [{ type: "text", text }],
    createdAt: Date.now(),
    status: "complete",
    ...(attachments.length > 0 ? { attachments } : {}),
  }

  return {
    node,
    conversation: touch({
      ...conversation,
      title:
        Object.keys(conversation.nodes).length === 0
          ? titleFromPrompt(text)
          : conversation.title,
      nodes: { ...conversation.nodes, [node.id]: node },
      headId: node.id,
    }),
  }
}

export function addAssistantPlaceholder(
  conversation: Conversation,
  model: ModelId,
  parentId: string | null = conversation.headId
): { conversation: Conversation; node: MessageNode } {
  const node: MessageNode = {
    id: createId("msg"),
    parentId,
    role: "assistant",
    content: [],
    createdAt: Date.now(),
    status: "streaming",
    model,
  }

  return {
    node,
    conversation: touch({
      ...conversation,
      nodes: { ...conversation.nodes, [node.id]: node },
      headId: node.id,
    }),
  }
}

export function updateNode(
  conversation: Conversation,
  nodeId: string,
  patch: Partial<MessageNode>
): Conversation {
  const node = conversation.nodes[nodeId]
  if (!node) return conversation

  return touch({
    ...conversation,
    nodes: { ...conversation.nodes, [nodeId]: { ...node, ...patch } },
  })
}

/**
 * Editing a prompt forks: the rewritten message becomes a sibling of the
 * original under the same parent, and the head moves to it. Nothing is
 * deleted, so the previous version stays reachable through the turn's pager.
 */
export function editUserMessage(
  conversation: Conversation,
  nodeId: string,
  text: string
): { conversation: Conversation; node: MessageNode } | null {
  const original = conversation.nodes[nodeId]
  if (!original || original.role !== "user") return null

  const node: MessageNode = {
    id: createId("msg"),
    parentId: original.parentId,
    role: "user",
    content: [{ type: "text", text }],
    createdAt: Date.now(),
    status: "complete",
    ...(original.attachments ? { attachments: original.attachments } : {}),
  }

  return {
    node,
    conversation: touch({
      ...conversation,
      nodes: { ...conversation.nodes, [node.id]: node },
      headId: node.id,
    }),
  }
}

/** Regenerating forks the reply the same way an edit forks the prompt. */
export function regenerateFrom(
  conversation: Conversation,
  assistantId: string,
  model: ModelId
): { conversation: Conversation; node: MessageNode } | null {
  const original = conversation.nodes[assistantId]
  if (!original || original.role !== "assistant") return null

  return addAssistantPlaceholder(conversation, model, original.parentId)
}

/**
 * Moving between siblings has to land on a leaf. Stopping at the sibling
 * itself would hide every turn recorded underneath it, which reads as data
 * loss even though nothing was lost.
 */
export function switchBranch(
  conversation: Conversation,
  nodeId: string
): Conversation {
  if (!conversation.nodes[nodeId]) return conversation

  return { ...conversation, headId: deepestLeaf(conversation, nodeId) }
}

export function deleteSubtree(
  conversation: Conversation,
  nodeId: string
): Conversation {
  const node = conversation.nodes[nodeId]
  if (!node) return conversation

  const doomed = new Set(descendantsOf(conversation, nodeId))
  const nodes = Object.fromEntries(
    Object.entries(conversation.nodes).filter(([id]) => !doomed.has(id))
  )

  return touch({
    ...conversation,
    nodes,
    headId: node.parentId
      ? deepestLeaf({ ...conversation, nodes }, node.parentId)
      : null,
  })
}

export function upsertArtifact(
  conversation: Conversation,
  draft: {
    id: string
    title: string
    kind: Artifact["kind"]
    language: string | null
    content: string
  },
  messageId: string
): Conversation {
  const existing = conversation.artifacts.find(
    (artifact) => artifact.id === draft.id
  )
  const version = { content: draft.content, createdAt: Date.now(), messageId }

  // Re-running a scripted conversation replays the same tool call, so an
  // identical body is not a new version.
  if (existing?.versions.at(-1)?.content === draft.content) return conversation

  const artifact: Artifact = existing
    ? {
        ...existing,
        title: draft.title,
        versions: [...existing.versions, version],
      }
    : {
        id: draft.id,
        title: draft.title,
        kind: draft.kind,
        language: draft.language,
        versions: [version],
      }

  return touch({
    ...conversation,
    artifacts: existing
      ? conversation.artifacts.map((entry) =>
          entry.id === artifact.id ? artifact : entry
        )
      : [...conversation.artifacts, artifact],
  })
}

/**
 * The history handed to a provider: the visible path only.
 *
 * Attachments are expanded here rather than stored inside the message, so the
 * bubble on screen shows a file chip while the model receives the file's
 * contents. Storing the expansion would mean rendering it too.
 */
export function toProviderMessages(
  path: MessageNode[]
): { role: "user" | "assistant"; content: ContentBlock[] }[] {
  return path
    .map((node) => {
      const attached = (node.attachments ?? []).map(
        (attachment): ContentBlock => ({
          type: "text",
          text:
            attachment.text === null
              ? `[Attached: ${attachment.name} (${attachment.mediaType}), contents not readable as text]`
              : `<attachment name="${attachment.name}">\n${attachment.text}\n</attachment>`,
        })
      )

      return { role: node.role, content: [...attached, ...node.content] }
    })
    .filter((message) => message.content.length > 0)
}
