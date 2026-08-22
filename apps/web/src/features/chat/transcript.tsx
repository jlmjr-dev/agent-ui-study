import {
  activePath,
  type Conversation,
  type MessageNode,
} from "@agent-ui-study/protocol"
import { ArrowDown } from "lucide-react"
import { IconButton } from "@agent-ui-study/ui"
import { useMemo } from "react"

import { useAutoScroll } from "@/shared/hooks/use-auto-scroll"

import { AssistantMessage } from "./assistant-message"
import { useRun } from "./run-context"
import { UserMessage } from "./user-message"

export type TranscriptProps = {
  conversation: Conversation
  onEdit: (nodeId: string, text: string) => void
  onRegenerate: (nodeId: string) => void
  onSwitchBranch: (nodeId: string) => void
  onOpenArtifact: (artifactId: string) => void
}

export function Transcript({
  conversation,
  onEdit,
  onRegenerate,
  onSwitchBranch,
  onOpenArtifact,
}: TranscriptProps) {
  const { run } = useRun()
  const path = useMemo(() => activePath(conversation), [conversation])

  // The streaming content is the thing that changes between frames, so it is
  // what the scroll follows; the path alone would only change once per turn.
  const { ref, pinned, onScroll, scrollToBottom } = useAutoScroll(
    run?.content.length ?? path.length
  )

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} onScroll={onScroll} className="h-full overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-6">
          {path.map((node: MessageNode) =>
            node.role === "user" ? (
              <UserMessage
                key={node.id}
                node={node}
                conversation={conversation}
                onEdit={onEdit}
                onSwitchBranch={onSwitchBranch}
              />
            ) : (
              <AssistantMessage
                key={node.id}
                node={node}
                conversation={conversation}
                onRegenerate={onRegenerate}
                onSwitchBranch={onSwitchBranch}
                onOpenArtifact={onOpenArtifact}
              />
            )
          )}
        </div>
      </div>

      {!pinned ? (
        <IconButton
          label="Scroll to the latest"
          onClick={() => scrollToBottom()}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 animate-rise border border-border bg-surface shadow-md"
        >
          <ArrowDown className="size-4" />
        </IconButton>
      ) : null}
    </div>
  )
}
