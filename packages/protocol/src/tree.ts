import type { Conversation } from "./conversation"
import type { MessageNode } from "./message"

/**
 * A conversation is a tree because both products being studied let you rewrite
 * history: editing a prompt or regenerating a reply forks a new branch off the
 * same parent instead of destroying what was there. The list you see on screen
 * is one root-to-leaf path through that tree, identified by its leaf: `headId`.
 */

export function childrenOf(
  conversation: Conversation,
  parentId: string | null
): MessageNode[] {
  return Object.values(conversation.nodes)
    .filter((node) => node.parentId === parentId)
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
}

export function siblingsOf(
  conversation: Conversation,
  nodeId: string
): MessageNode[] {
  const node = conversation.nodes[nodeId]
  if (!node) return []

  return childrenOf(conversation, node.parentId)
}

export function branchIndexOf(
  conversation: Conversation,
  nodeId: string
): { index: number; total: number } {
  const siblings = siblingsOf(conversation, nodeId)

  return {
    index: siblings.findIndex((sibling) => sibling.id === nodeId),
    total: siblings.length,
  }
}

/** The path from the root down to `headId`, oldest first. */
export function activePath(conversation: Conversation): MessageNode[] {
  const path: MessageNode[] = []
  const seen = new Set<string>()

  let cursor = conversation.headId

  while (cursor) {
    // Persisted state has survived edits and reloads; a cycle would hang the
    // render, so stop the walk rather than trust the data.
    if (seen.has(cursor)) break
    seen.add(cursor)

    const node = conversation.nodes[cursor]
    if (!node) break

    path.push(node)
    cursor = node.parentId
  }

  return path.reverse()
}

/**
 * Walking down from a node, always taking the newest child. Switching to a
 * sibling has to land on a leaf, otherwise the turns below the switch point
 * vanish from the transcript even though they are still in the tree.
 */
export function deepestLeaf(
  conversation: Conversation,
  nodeId: string
): string {
  let cursor = nodeId
  const seen = new Set<string>()

  for (;;) {
    if (seen.has(cursor)) return cursor
    seen.add(cursor)

    const children = childrenOf(conversation, cursor)
    const next = children.at(-1)
    if (!next) return cursor

    cursor = next.id
  }
}

export function pathContains(
  conversation: Conversation,
  nodeId: string
): boolean {
  return activePath(conversation).some((node) => node.id === nodeId)
}

/** Every node below `nodeId`, including itself. */
export function descendantsOf(
  conversation: Conversation,
  nodeId: string
): string[] {
  const collected: string[] = []
  const queue = [nodeId]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || collected.includes(current)) continue

    collected.push(current)
    queue.push(...childrenOf(conversation, current).map((node) => node.id))
  }

  return collected
}
