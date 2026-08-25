import {
  branchIndexOf,
  modelInfo,
  siblingsOf,
  textOf,
  type Conversation,
  type MessageNode,
} from "@agent-ui-study/protocol"
import { Check, CircleAlert, Copy, RefreshCw } from "lucide-react"
import { Badge, Button, IconButton, cn } from "@agent-ui-study/ui"

import { BlockList } from "@/features/blocks/block-list"
import { useSettings } from "@/features/settings/settings-context"
import { formatTokens } from "@/shared/lib/format"
import { useCopy } from "@/shared/hooks/use-copy"

import { BranchPager } from "./branch-pager"
import { useMessageContent, useRun } from "./run-context"

export type AssistantMessageProps = {
  node: MessageNode
  conversation: Conversation
  /** The last turn keeps its actions on screen; earlier ones reveal on hover. */
  isLatest: boolean
  onRegenerate: (nodeId: string) => void
  onSwitchBranch: (nodeId: string) => void
  onOpenArtifact: (artifactId: string) => void
}

export function AssistantMessage({
  node,
  conversation,
  isLatest,
  onRegenerate,
  onSwitchBranch,
  onOpenArtifact,
}: AssistantMessageProps) {
  const { settings } = useSettings()
  const { run } = useRun()
  const { copied, copy } = useCopy()

  const content = useMessageContent(node)
  const streaming = run?.messageId === node.id
  const { index, total } = branchIndexOf(conversation, node.id)

  return (
    <div className="group/assistant mt-4">
      <BlockList
        blocks={content}
        streaming={streaming}
        showThinking={settings.showThinking}
        onOpenArtifact={onOpenArtifact}
      />

      {node.status === "error" ? (
        <div className="my-2 flex items-start gap-2 rounded-xl border border-danger/35 bg-danger/8 p-3 text-[13px] text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">That turn failed</p>
            <p className="mt-0.5 break-words opacity-90">{node.error}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onRegenerate(node.id)}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {node.status === "stopped" ? (
        <p className="mt-1 text-[12px] text-text-faint italic">
          Stopped by you
        </p>
      ) : null}

      {/* The composer owns stopping a run, so this row waits it out rather than
          offering a second, quieter stop button beside it. */}
      <div
        className={cn(
          "mt-1.5 flex items-center gap-1",
          streaming && "invisible",
          !streaming &&
            !isLatest &&
            "reveal group-hover/assistant:visible group-hover/assistant:opacity-100"
        )}
      >
        {streaming ? null : (
          <>
            <IconButton
              size="sm"
              label={copied ? "Copied" : "Copy response"}
              onClick={() => void copy(textOf(content))}
            >
              {copied ? (
                <Check className="size-3.5 text-success" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </IconButton>

            <IconButton
              size="sm"
              label="Try again"
              onClick={() => onRegenerate(node.id)}
            >
              <RefreshCw className="size-3.5" />
            </IconButton>

            <BranchPager
              index={index}
              total={total}
              label="response"
              onSelect={(next) =>
                onSwitchBranch(siblingsOf(conversation, node.id)[next].id)
              }
            />

            {node.model ? (
              <Badge className="ml-1">{modelInfo(node.model).name}</Badge>
            ) : null}

            {node.usage?.output_tokens ? (
              <span className="text-[11px] text-text-faint tabular-nums">
                {formatTokens(node.usage.output_tokens)} tokens
              </span>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
