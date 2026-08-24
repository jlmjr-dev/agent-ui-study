import { FolderTree, PanelLeft, PanelRight } from "lucide-react"
import { IconButton, cn } from "@agent-ui-study/ui"
import { useCallback, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { ChatScreen } from "@/features/chat/chat-screen"
import { ArtifactPanel } from "@/features/artifacts/artifact-panel"
import { SettingsDialog } from "@/features/settings/settings-dialog"
import { Sidebar } from "@/features/sidebar/sidebar"
import { useSettings } from "@/features/settings/settings-context"
import { WorkspacePanel } from "@/features/workspace/workspace-panel"
import { createConversation } from "@/services/actions"
import { useStore } from "@/services/store-context"
import { useHotkeys } from "@/shared/hooks/use-hotkeys"
import { useApplyTheme } from "@/features/theme/use-theme"

type SidePanel =
  { kind: "artifact"; id: string | null } | { kind: "workspace" } | null

/**
 * The three-column frame. The sidebar collapses, the side panel is optional,
 * and the conversation always keeps the middle: on a phone both side surfaces
 * become overlays so the transcript never gets squeezed into a gutter.
 */
export function Shell() {
  useApplyTheme()

  const store = useStore()
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const { settings, set } = useSettings()

  const [panel, setPanel] = useState<SidePanel>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const conversation = conversationId ? store.get(conversationId) : undefined

  const newChat = useCallback(() => {
    setPanel(null)
    navigate("/")
  }, [navigate])

  // On a phone the sidebar is a drawer over the conversation, so picking a
  // chat has to dismiss it. On a desktop it is a column and stays put.
  const closeSidebarOnPhone = useCallback(() => {
    if (!window.matchMedia("(min-width: 768px)").matches) {
      set("sidebarOpen", false)
    }
  }, [set])

  useHotkeys(
    useMemo(
      () => [
        { key: "k", meta: true, run: () => setSettingsOpen(true) },
        {
          key: "b",
          meta: true,
          run: () => set("sidebarOpen", !settings.sidebarOpen),
        },
        { key: "j", meta: true, run: newChat },
      ],
      [newChat, set, settings.sidebarOpen]
    )
  )

  const openArtifact = useCallback(
    (id: string) => setPanel({ kind: "artifact", id }),
    []
  )

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      {settings.sidebarOpen ? (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/40 md:hidden"
            onClick={() => set("sidebarOpen", false)}
          />
          <div className="fixed inset-y-0 left-0 z-30 w-64 md:static md:z-auto md:shrink-0">
            <Sidebar
              onClose={() => set("sidebarOpen", false)}
              onOpenSettings={() => setSettingsOpen(true)}
              onNavigate={closeSidebarOnPhone}
            />
          </div>
        </>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-2">
          {settings.sidebarOpen ? null : (
            <IconButton
              label="Show sidebar"
              onClick={() => set("sidebarOpen", true)}
            >
              <PanelLeft className="size-4" />
            </IconButton>
          )}

          <p className="min-w-0 flex-1 truncate px-2 text-[13px] font-medium text-text">
            {conversation?.title ?? "New chat"}
          </p>

          <IconButton
            label="Workspace files"
            active={panel?.kind === "workspace"}
            onClick={() =>
              setPanel((current) =>
                current?.kind === "workspace" ? null : { kind: "workspace" }
              )
            }
          >
            <FolderTree className="size-4" />
          </IconButton>

          <IconButton
            label="Artifacts"
            active={panel?.kind === "artifact"}
            onClick={() =>
              setPanel((current) =>
                current?.kind === "artifact"
                  ? null
                  : {
                      kind: "artifact",
                      id: conversation?.artifacts.at(-1)?.id ?? null,
                    }
              )
            }
          >
            <PanelRight className="size-4" />
          </IconButton>
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1">
            {conversation ? (
              <ChatScreen
                key={conversation.id}
                conversation={conversation}
                onOpenArtifact={openArtifact}
              />
            ) : (
              <NewChat />
            )}
          </div>

          {panel ? (
            <div
              className={cn(
                "fixed inset-0 z-30 md:static md:z-auto",
                "md:w-[42%] md:min-w-96 lg:w-[46%]"
              )}
            >
              {panel.kind === "workspace" ? (
                <WorkspacePanel onClose={() => setPanel(null)} />
              ) : conversation ? (
                <ArtifactPanel
                  conversation={conversation}
                  artifactId={panel.id}
                  onSelect={(id) => setPanel({ kind: "artifact", id })}
                  onClose={() => setPanel(null)}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </main>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}

/**
 * A conversation is only written to storage once it has a message in it, so
 * the "new chat" route holds a plain draft object and lets the first send
 * commit it. Creating the store row up front would leave an empty chat in the
 * sidebar for every visit to `/`, and writing to the store while rendering
 * this component is a state update during another component's render.
 */
function NewChat() {
  const store = useStore()
  const navigate = useNavigate()
  const [draft] = useState(createConversation)

  return (
    <ChatScreen
      conversation={store.get(draft.id) ?? draft}
      onOpenArtifact={() => navigate(`/c/${draft.id}`)}
      onStarted={(id) => navigate(`/c/${id}`, { replace: true })}
    />
  )
}
