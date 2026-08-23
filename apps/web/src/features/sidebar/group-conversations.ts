import type { Conversation } from "@agent-ui-study/protocol"

import { bucketOf } from "@/shared/lib/format"

/**
 * Grouped by recency, pinned first. Search matches the title and the text of
 * every message, because "that chat where I asked about tax" is how people
 * actually look for one.
 */
export function groupConversations(
  conversations: Conversation[],
  query: string,
  now = Date.now()
): [string, Conversation[]][] {
  const needle = query.trim().toLowerCase()

  const matched = needle
    ? conversations.filter((conversation) => {
        if (conversation.title.toLowerCase().includes(needle)) return true

        return Object.values(conversation.nodes).some((node) =>
          node.content.some(
            (block) =>
              block.type === "text" && block.text.toLowerCase().includes(needle)
          )
        )
      })
    : conversations

  const groups = new Map<string, Conversation[]>()

  for (const conversation of matched) {
    const label = conversation.pinned
      ? "Pinned"
      : bucketOf(conversation.updatedAt, now)
    const existing = groups.get(label)

    if (existing) existing.push(conversation)
    else groups.set(label, [conversation])
  }

  return [...groups.entries()]
}
