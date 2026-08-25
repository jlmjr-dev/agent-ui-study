import type {
  Attachment,
  Conversation,
  ModelId,
} from "@agent-ui-study/protocol"
import { useCallback } from "react"

import {
  addUserMessage,
  editUserMessage,
  switchBranch,
} from "@/services/actions"
import { useStore } from "@/services/store-context"

import { Composer } from "./composer"
import { Transcript } from "./transcript"
import { useRun } from "./run-context"
import { Welcome } from "./welcome"

export type ChatScreenProps = {
  conversation: Conversation
  onOpenArtifact: (artifactId: string) => void
  /** Fires the first time this conversation is written to the store. */
  onStarted?: (conversationId: string) => void
}

export function ChatScreen({
  conversation,
  onOpenArtifact,
  onStarted,
}: ChatScreenProps) {
  const store = useStore()
  const { start, stop, isRunning } = useRun()
  const running = isRunning(conversation.id)
  const empty = Object.keys(conversation.nodes).length === 0

  const send = useCallback(
    (text: string, attachments: Attachment[]) => {
      const next = addUserMessage(conversation, text, attachments)

      // A draft conversation is not in the store until now, so this is an
      // upsert rather than an update.
      store.upsert(next.conversation)
      start(next.conversation, next.node.id)
      onStarted?.(conversation.id)
    },
    [conversation, onStarted, start, store]
  )

  const edit = useCallback(
    (nodeId: string, text: string) => {
      const next = editUserMessage(conversation, nodeId, text)
      if (!next) return

      store.upsert(next.conversation)
      start(next.conversation, next.node.id)
    },
    [conversation, start, store]
  )

  const regenerate = useCallback(
    (nodeId: string) => {
      const original = conversation.nodes[nodeId]
      if (!original) return

      // Starting a run under the original's parent is what makes the new
      // reply a sibling. Creating a node here as well would add two.
      start(conversation, original.parentId)
    },
    [conversation, start]
  )

  const setModel = useCallback(
    (model: ModelId) =>
      store.update(conversation.id, (current) => ({ ...current, model })),
    [conversation.id, store]
  )

  const composer = (
    <Composer
      model={conversation.model}
      onModelChange={setModel}
      onSend={send}
      onStop={stop}
      running={running}
      autoFocus={empty}
    />
  )

  const footnote = (
    <p className="mt-2 text-center text-[11px] text-text-faint">
      A study rebuild. Replies come from scripted conversations unless a key is
      set.
    </p>
  )

  // On an empty chat the composer is the whole interface, so the greeting, the
  // input and the suggestions form one centred group rather than being split
  // across the full height of the viewport.
  if (empty) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center overflow-y-auto px-4 py-10">
        <div className="w-full max-w-3xl">
          <Welcome onPick={(prompt) => send(prompt, [])} composer={composer} />
          {footnote}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Transcript
        conversation={conversation}
        onEdit={edit}
        onRegenerate={regenerate}
        onSwitchBranch={(nodeId) =>
          store.update(conversation.id, (current) =>
            switchBranch(current, nodeId)
          )
        }
        onOpenArtifact={onOpenArtifact}
      />

      <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pt-1 pb-4">
        {composer}
        {footnote}
      </div>
    </div>
  )
}
