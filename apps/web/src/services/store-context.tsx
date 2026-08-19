import { createFileSystem, SEED_WORKSPACE } from "@agent-ui-study/tools"
import type { Conversation } from "@agent-ui-study/protocol"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { BUILT_IN_PERSONAS, type Persona } from "@/features/personas/personas"
import { readJson, writeJson } from "@/services/storage"

const CONVERSATIONS_KEY = "aus:conversations"
const PERSONAS_KEY = "aus:personas"
const WORKSPACE_KEY = "aus:workspace"

export type StoreValue = {
  conversations: Conversation[]
  personas: Persona[]
  workspace: ReturnType<typeof createFileSystem>
  /** Bumped whenever a tool writes, so the workspace panel repaints. */
  workspaceVersion: number
  get(id: string): Conversation | undefined
  /** Writes a conversation whether or not it is already stored. */
  upsert(conversation: Conversation): void
  update(
    id: string,
    next: Conversation | ((current: Conversation) => Conversation)
  ): void
  remove(id: string): void
  savePersona(persona: Persona): void
  removePersona(id: string): void
  commitWorkspace(): void
  resetAll(): void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<
    Record<string, Conversation>
  >(() => readJson(CONVERSATIONS_KEY, {}))
  const [personas, setPersonas] = useState<Persona[]>(() =>
    readJson(PERSONAS_KEY, BUILT_IN_PERSONAS)
  )
  const [workspaceVersion, setWorkspaceVersion] = useState(0)

  // The filesystem is mutable and lives outside React: tools write to it
  // synchronously mid-run, and copying it on every write would be pure waste.
  // A version counter is what the panel subscribes to instead. A lazy state
  // initializer rather than a ref, because it is read during render.
  const [workspace] = useState(() =>
    createFileSystem(readJson(WORKSPACE_KEY, SEED_WORKSPACE))
  )

  useEffect(() => {
    writeJson(CONVERSATIONS_KEY, conversations)
  }, [conversations])

  useEffect(() => {
    writeJson(PERSONAS_KEY, personas)
  }, [personas])

  const update = useCallback<StoreValue["update"]>((id, next) => {
    setConversations((current) => {
      const existing = current[id]
      if (!existing) return current

      const updated = typeof next === "function" ? next(existing) : next

      return { ...current, [id]: updated }
    })
  }, [])

  const value = useMemo<StoreValue>(() => {
    const sorted = Object.values(conversations).sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1

      return b.updatedAt - a.updatedAt
    })

    return {
      conversations: sorted,
      personas,
      workspace,
      workspaceVersion,

      get: (id) => conversations[id],

      upsert: (conversation) =>
        setConversations((current) => ({
          ...current,
          [conversation.id]: conversation,
        })),

      update,

      remove: (id) =>
        setConversations((current) => {
          const { [id]: _removed, ...rest } = current

          return rest
        }),

      savePersona: (persona) =>
        setPersonas((current) => {
          const index = current.findIndex((entry) => entry.id === persona.id)
          if (index === -1) return [...current, persona]

          return current.map((entry) =>
            entry.id === persona.id ? persona : entry
          )
        }),

      removePersona: (id) =>
        setPersonas((current) =>
          current.filter((persona) => persona.id !== id)
        ),

      commitWorkspace: () => {
        writeJson(WORKSPACE_KEY, workspace.snapshot())
        setWorkspaceVersion((version) => version + 1)
      },

      resetAll: () => {
        setConversations({})
        setPersonas(BUILT_IN_PERSONAS)

        for (const path of workspace.paths()) workspace.remove(path)
        for (const [path, content] of Object.entries(SEED_WORKSPACE)) {
          workspace.write(path, content)
        }

        writeJson(WORKSPACE_KEY, workspace.snapshot())
        setWorkspaceVersion((version) => version + 1)
      },
    }
  }, [conversations, personas, update, workspace, workspaceVersion])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error("useStore must be used inside a StoreProvider")

  return value
}
