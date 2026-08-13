import type { MessageNode } from "./message"
import type { ModelId } from "./models"

export type ArtifactKind = "markdown" | "code" | "html"

export type ArtifactVersion = {
  content: string
  createdAt: number
  /** The message whose tool call produced this version. */
  messageId: string
}

export type Artifact = {
  id: string
  title: string
  kind: ArtifactKind
  language: string | null
  versions: ArtifactVersion[]
}

export type Conversation = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  pinned: boolean
  model: ModelId
  personaId: string | null
  nodes: Record<string, MessageNode>
  /** The leaf of the path currently on screen. */
  headId: string | null
  artifacts: Artifact[]
}

export type ConversationSummary = Pick<
  Conversation,
  "id" | "title" | "createdAt" | "updatedAt" | "pinned"
>

export function summarize(conversation: Conversation): ConversationSummary {
  const { id, title, createdAt, updatedAt, pinned } = conversation

  return { id, title, createdAt, updatedAt, pinned }
}

export function latestVersion(artifact: Artifact): ArtifactVersion | null {
  return artifact.versions.at(-1) ?? null
}
