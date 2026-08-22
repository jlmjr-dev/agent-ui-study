import {
  branchIndexOf,
  modelInfo,
  siblingsOf,
  textOf,
  type Conversation,
  type MessageNode,
} from "@agent-ui-study/protocol"
import { Check, CircleAlert, Copy, RefreshCw, Square } from "lucide-react"
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
  onRegenerate: (nodeId: string) => void
  onSwitchBranch: (nodeId: string) => void
  onOpenArtifact: (artifactId: string) => void
}

export function AssistantMessage({
  node,
  conversation,
  onRegenerate,
  onSwitchBranch,
  onOpenArtifact,
}: AssistantMessageProps) {
  const { settings } = useSettings()
  const { run, stop } = useRun()
  const { copied, copy } = useCopy()

  const content = useMessageContent(node)
  const streaming = run?.messageId === node.id
  const { index, total } = branchIndexOf(conversation, node.id)

  return (
    <div className="group/assistant">
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

      <div
        className={cn(
          "mt-1.5 flex items-center gap-1 transition-opacity",
          streaming
            ? "opacity-100"
            : "opacity-0 group-hover/assistant:opacity-100 focus-within:opacity-100"
        )}
      >
        {streaming ? (
          <Button
            size="sm"
            variant="secondary"
            icon={<Square className="size-3" />}
            onClick={stop}
          >
            Stop
          </Button>
        ) : (
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
