import type { Attachment, ModelId } from "@agent-ui-study/protocol"
import { createId } from "@agent-ui-study/protocol"
import { ArrowUp, Paperclip, Square, X } from "lucide-react"
import { IconButton, cn } from "@agent-ui-study/ui"
import { useEffect, useRef, useState } from "react"

import { formatBytes } from "@/shared/lib/format"

import { ModelPicker } from "./model-picker"

const MAX_TEXT_BYTES = 200_000

export type ComposerProps = {
  model: ModelId
  onModelChange: (model: ModelId) => void
  onSend: (text: string, attachments: Attachment[]) => void
  onStop: () => void
  running: boolean
  autoFocus?: boolean
}

export function Composer({
  model,
  onModelChange,
  onSend,
  onStop,
  running,
  autoFocus,
}: ComposerProps) {
  const [text, setText] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const textarea = useRef<HTMLTextAreaElement>(null)
  const filePicker = useRef<HTMLInputElement>(null)

  // Grows with the content up to a ceiling, then scrolls. Measuring against a
  // reset height is what stops it from ratcheting taller as text is deleted.
  useEffect(() => {
    const element = textarea.current
    if (!element) return

    element.style.height = "auto"
    element.style.height = `${Math.min(element.scrollHeight, 320)}px`
  }, [text])

  function submit() {
    const trimmed = text.trim()
    if (!trimmed || running) return

    onSend(trimmed, attachments)
    setText("")
    setAttachments([])
  }

  async function attach(files: FileList | null) {
    if (!files) return

    const read = await Promise.all(
      [...files].map(async (file) => {
        const readable =
          file.type.startsWith("text/") ||
          /\.(md|txt|json|ts|tsx|js|jsx|css|html|ya?ml|csv)$/i.test(file.name)

        return {
          id: createId("att"),
          name: file.name,
          mediaType: file.type || "application/octet-stream",
          bytes: file.size,
          text:
            readable && file.size <= MAX_TEXT_BYTES ? await file.text() : null,
        }
      })
    )

    setAttachments((current) => [...current, ...read])
  }

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm transition-colors focus-within:border-border-strong">
      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-3 pt-3">
          {attachments.map((attachment) => (
            <span
              key={attachment.id}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised py-1 pr-1 pl-2 text-[12px] text-text-muted"
            >
              <span className="max-w-40 truncate">{attachment.name}</span>
              <span className="text-text-faint">
                {formatBytes(attachment.bytes)}
              </span>
              {attachment.text === null ? (
                <span className="text-warning" title="Only the name is sent">
                  name only
                </span>
              ) : null}
              <IconButton
                size="sm"
                label={`Remove ${attachment.name}`}
                onClick={() =>
                  setAttachments((current) =>
                    current.filter((entry) => entry.id !== attachment.id)
                  )
                }
              >
                <X className="size-3" />
              </IconButton>
            </span>
          ))}
        </div>
      ) : null}

      <textarea
        ref={textarea}
        value={text}
        autoFocus={autoFocus}
        rows={1}
        placeholder="Ask anything, or describe a change to make"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            submit()
          }
        }}
        className="max-h-80 w-full resize-none bg-transparent px-4 py-3.5 text-[15px] leading-7 text-text outline-none placeholder:text-text-faint"
      />

      <div className="flex items-center gap-1 px-2 pb-2">
        <input
          ref={filePicker}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            void attach(event.target.files)
            event.target.value = ""
          }}
        />

        <IconButton
          label="Attach files"
          onClick={() => filePicker.current?.click()}
        >
          <Paperclip className="size-4" />
        </IconButton>

        <ModelPicker value={model} onChange={onModelChange} />

        <span className="flex-1" />

        {running ? (
          <IconButton
            label="Stop generating"
            onClick={onStop}
            className="bg-surface-raised text-text hover:bg-border"
          >
            <Square className="size-3.5 fill-current" />
          </IconButton>
        ) : (
          <button
            type="button"
            aria-label="Send message"
            disabled={!text.trim()}
            onClick={submit}
            className={cn(
              "grid size-8 place-items-center rounded-lg focus-ring transition-colors",
              text.trim()
                ? "bg-accent text-accent-fg hover:bg-accent-hover"
                : "cursor-not-allowed bg-surface-raised text-text-faint"
            )}
          >
            <ArrowUp className="size-4" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  )
}
