import { composeSystem, runAgent } from "@agent-ui-study/engine"
import {
  activePath,
  createAssembler,
  type ContentBlock,
  type Conversation,
  type MessageNode,
  type ModelId,
} from "@agent-ui-study/protocol"
import { TOOL_DEFINITIONS } from "@agent-ui-study/tools"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { personaById } from "@/features/personas/personas"
import { providerFor } from "@/features/settings/live-provider"
import { useSettings } from "@/features/settings/settings-context"
import {
  addAssistantPlaceholder,
  toProviderMessages,
  updateNode,
  upsertArtifact,
} from "@/services/actions"
import { useStore } from "@/services/store-context"

export type RunState = {
  conversationId: string
  messageId: string
  content: ContentBlock[]
}

type RunValue = {
  run: RunState | null
  isRunning: (conversationId: string) => boolean
  start: (
    conversation: Conversation,
    parentId: string | null,
    model?: ModelId
  ) => void
  stop: () => void
}

const RunContext = createContext<RunValue | null>(null)

/**
 * Owns the in-flight turn.
 *
 * The streaming message deliberately does **not** live in the store. A turn
 * emits a few hundred deltas, and writing each one into the conversation would
 * rewrite the persisted object, re-sort the sidebar and re-render every turn on
 * screen, several times a second. Instead the run holds the partial blocks and
 * only the message being written subscribes to them; the store is touched twice
 * per turn, once to open the message and once to commit it.
 */
export function RunProvider({ children }: { children: ReactNode }) {
  const store = useStore()
  const { settings } = useSettings()
  const [run, setRun] = useState<RunState | null>(null)
  const controller = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    controller.current?.abort()
    controller.current = null
  }, [])

  const start = useCallback<RunValue["start"]>(
    (conversation, parentId, model) => {
      controller.current?.abort()

      const chosenModel = model ?? conversation.model
      const opened = addAssistantPlaceholder(
        conversation,
        chosenModel,
        parentId
      )
      const messageId = opened.node.id

      store.update(conversation.id, opened.conversation)
      setRun({ conversationId: conversation.id, messageId, content: [] })

      const abort = new AbortController()
      controller.current = abort

      const provider = providerFor(settings)

      const persona = personaById(store.personas, conversation.personaId)

      // The history is the visible path only. Branches the user navigated away
      // from are still in the tree, but they are not what this turn continues.
      const history = toProviderMessages(
        activePath({ ...opened.conversation, headId: parentId })
      )

      const assembler = createAssembler()
      let wroteWorkspace = false

      void (async () => {
        try {
          for await (const event of runAgent({
            provider,
            context: {
              fs: store.workspace,
              onArtifact: (draft) => {
                wroteWorkspace = true
                store.update(conversation.id, (current) =>
                  upsertArtifact(current, draft, messageId)
                )
              },
            },
            model: chosenModel,
            system: composeSystem(persona?.instructions ?? null),
            messages: history,
            tools: TOOL_DEFINITIONS,
            toolLatencyMs: settings.instantStream ? 0 : 320,
            signal: abort.signal,
          })) {
            assembler.handle(event)

            if (event.type === "content_block_stop") {
              const block = assembler.snapshot().content[event.index]
              if (block?.type === "tool_result") wroteWorkspace = true
            }

            setRun((current) =>
              current?.messageId === messageId
                ? { ...current, content: assembler.snapshot().content }
                : current
            )
          }

          const final = assembler.snapshot()

          store.update(conversation.id, (current) =>
            updateNode(current, messageId, {
              content: final.content,
              status: abort.signal.aborted
                ? "stopped"
                : final.error
                  ? "error"
                  : "complete",
              stopReason: final.stopReason,
              usage: final.usage,
              ...(final.error ? { error: final.error } : {}),
            })
          )

          if (wroteWorkspace) store.commitWorkspace()
        } catch (error) {
          store.update(conversation.id, (current) =>
            updateNode(current, messageId, {
              status: "error",
              error: error instanceof Error ? error.message : String(error),
            })
          )
        } finally {
          if (controller.current === abort) controller.current = null
          setRun((current) =>
            current?.messageId === messageId ? null : current
          )
        }
      })()
    },
    [settings, store]
  )

  const value = useMemo<RunValue>(
    () => ({
      run,
      isRunning: (conversationId) => run?.conversationId === conversationId,
      start,
      stop,
    }),
    [run, start, stop]
  )

  return <RunContext.Provider value={value}>{children}</RunContext.Provider>
}

export function useRun(): RunValue {
  const value = useContext(RunContext)
  if (!value) throw new Error("useRun must be used inside a RunProvider")

  return value
}

/** The blocks to draw for a message: live ones while it streams, stored after. */
export function useMessageContent(node: MessageNode): ContentBlock[] {
  const { run } = useRun()

  return run?.messageId === node.id ? run.content : node.content
}
