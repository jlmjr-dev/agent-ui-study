import {
  MessageSquarePlus,
  MoreHorizontal,
  PanelLeft,
  Pin,
  PinOff,
  Search,
  Settings,
  Trash2,
} from "lucide-react"
import {
  Button,
  EmptyState,
  IconButton,
  Input,
  Menu,
  cn,
} from "@agent-ui-study/ui"
import { useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { useStore } from "@/services/store-context"
import { Wordmark } from "@/shared/components/wordmark"

import { groupConversations } from "./group-conversations"

export type SidebarProps = {
  onClose: () => void
  onOpenSettings: () => void
}

export function Sidebar({ onClose, onOpenSettings }: SidebarProps) {
  const store = useStore()
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const [query, setQuery] = useState("")

  const groups = useMemo(
    () => groupConversations(store.conversations, query),
    [store.conversations, query]
  )

  return (
    <nav className="flex h-full w-full flex-col border-r border-border bg-surface-sunken">
      <header className="flex items-center gap-1 px-3 py-3">
        <Wordmark className="size-5" />
        <span className="flex-1 text-[13px] font-semibold tracking-tight text-text">
          agent-ui-study
        </span>
        <IconButton size="sm" label="Hide sidebar" onClick={onClose}>
          <PanelLeft className="size-4" />
        </IconButton>
      </header>

      <div className="grid gap-2 px-3 pb-3">
        <Button
          variant="secondary"
          icon={<MessageSquarePlus className="size-4" />}
          onClick={() => navigate("/")}
          className="justify-start"
        >
          New chat
        </Button>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-text-faint" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats"
            className="h-8 pl-8 text-[13px]"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {groups.length === 0 ? (
          <EmptyState
            title={query ? "No matches" : "No chats yet"}
            description={
              query
                ? "Try a different word."
                : "Your conversations show up here."
            }
          />
        ) : (
          groups.map(([label, items]) => (
            <section key={label} className="mb-3">
              <h2 className="px-2 py-1 text-[11px] font-medium text-text-faint">
                {label}
              </h2>

              <ul>
                {items.map((conversation) => (
                  <li key={conversation.id} className="group/row relative">
                    <Link
                      to={`/c/${conversation.id}`}
                      className={cn(
                        "block truncate rounded-lg py-1.5 pr-9 pl-2 text-[13px] focus-ring transition-colors",
                        conversation.id === conversationId
                          ? "bg-surface-raised text-text"
                          : "text-text-muted hover:bg-surface-raised hover:text-text"
                      )}
                    >
                      {conversation.pinned ? (
                        <Pin className="mr-1 inline size-3 align-[-1px]" />
                      ) : null}
                      {conversation.title}
                    </Link>

                    <span className="absolute top-1/2 right-1 -translate-y-1/2 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
                      <Menu
                        align="end"
                        trigger={(props) => (
                          <IconButton size="sm" label="Chat options" {...props}>
                            <MoreHorizontal className="size-3.5" />
                          </IconButton>
                        )}
                        items={[
                          {
                            id: "pin",
                            label: conversation.pinned ? "Unpin" : "Pin",
                            icon: conversation.pinned ? (
                              <PinOff className="size-3.5" />
                            ) : (
                              <Pin className="size-3.5" />
                            ),
                            onSelect: () =>
                              store.update(conversation.id, (current) => ({
                                ...current,
                                pinned: !current.pinned,
                              })),
                          },
                          {
                            id: "delete",
                            label: "Delete",
                            icon: <Trash2 className="size-3.5" />,
                            danger: true,
                            onSelect: () => {
                              store.remove(conversation.id)
                              if (conversation.id === conversationId)
                                navigate("/")
                            },
                          },
                        ]}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <footer className="border-t border-border p-2">
        <Button
          variant="ghost"
          icon={<Settings className="size-4" />}
          onClick={onOpenSettings}
          className="w-full justify-start"
        >
          Settings
        </Button>
      </footer>
    </nav>
  )
}
