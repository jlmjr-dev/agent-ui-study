import type { ContentBlock } from "./content"
import type { ModelId } from "./models"
import type { StopReason, Usage } from "./events"

export type Role = "user" | "assistant"

/**
 * `streaming` and `stopped` exist because a turn is a first-class thing the
 * user can interrupt; a stopped turn keeps whatever it had produced.
 */
export type MessageStatus = "complete" | "streaming" | "stopped" | "error"

export type Attachment = {
  id: string
  name: string
  mediaType: string
  bytes: number
  /** Text files are read into the turn; anything else is described only. */
  text: string | null
}

/**
 * A message is a node in a tree, not an entry in a list. Editing a message or
 * regenerating a reply adds a sibling rather than overwriting, which is what
 * makes the "2 / 3" pager on a turn possible.
 */
export type MessageNode = {
  id: string
  parentId: string | null
  role: Role
  content: ContentBlock[]
  createdAt: number
  status: MessageStatus
  model?: ModelId
  stopReason?: StopReason | null
  usage?: Usage
  error?: string
  attachments?: Attachment[]
}
