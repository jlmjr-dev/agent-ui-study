import {
  branchIndexOf,
  siblingsOf,
  type Conversation,
  type MessageNode,
} from "@agent-ui-study/protocol"
import { Check, Copy, Paperclip, Pencil } from "lucide-react"
import { Button, IconButton, Textarea } from "@agent-ui-study/ui"
import { useState } from "react"

import { formatBytes } from "@/shared/lib/format"
import { useCopy } from "@/shared/hooks/use-copy"

import { BranchPager } from "./branch-pager"

export type UserMessageProps = {
  node: MessageNode
  conversation: Conversation
  onEdit: (nodeId: string, text: string) => void
  onSwitchBranch: (nodeId: string) => void
}

export function UserMessage({
  node,
  conversation,
  onEdit,
  onSwitchBranch,
}: UserMessageProps) {
  const [editing, setEditing] = useState(false)
  const { copied, copy } = useCopy()

  const text = node.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")

  const { index, total } = branchIndexOf(conversation, node.id)

  if (editing) {
    return (
      <EditForm
        initial={text}
        onCancel={() => setEditing(false)}
        onSubmit={(next) => {
          setEditing(false)
          if (next.trim() && next !== text) onEdit(node.id, next)
        }}
      />
    )
  }

  return (
    <div className="group/user mt-10 flex flex-col items-end gap-1.5 first:mt-0">
      {node.attachments?.length ? (
        <div className="flex flex-wrap justify-end gap-1.5">
          {node.attachments.map((attachment) => (
            <span
              key={attachment.id}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1 text-[12px] text-text-muted"
            >
              <Paperclip className="size-3" />
              <span className="max-w-40 truncate">{attachment.name}</span>
              <span className="text-text-faint">
                {formatBytes(attachment.bytes)}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-surface-raised px-4 py-2.5 text-[16px] leading-[1.7] whitespace-pre-wrap text-text">
        {text}
      </div>

      <div className="reveal flex items-center gap-1 group-hover/user:visible group-hover/user:opacity-100">
        <BranchPager
          index={index}
          total={total}
          label="version"
          onSelect={(next) =>
            onSwitchBranch(siblingsOf(conversation, node.id)[next].id)
          }
        />
        <IconButton
          size="sm"
          label="Edit message"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-3.5" />
        </IconButton>
        <IconButton
          size="sm"
          label={copied ? "Copied" : "Copy message"}
          onClick={() => void copy(text)}
        >
          {copied ? (
            <Check className="size-3.5 text-success" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </IconButton>
      </div>
    </div>
  )
}

function EditForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: string
  onSubmit: (text: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initial)

  return (
    <div className="ml-auto w-full max-w-[85%] rounded-2xl bg-surface-raised p-2">
      <Textarea
        value={value}
        data-autofocus
        autoFocus
        rows={Math.min(12, value.split("\n").length + 1)}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel()
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            onSubmit(value)
          }
        }}
        className="border-transparent bg-transparent text-[16px] leading-[1.7]"
      />

      <div className="flex items-center justify-end gap-2 px-1 pt-1">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" onClick={() => onSubmit(value)}>
          Send
        </Button>
      </div>
    </div>
  )
}
