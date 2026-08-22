import type { ContentBlock, ToolResultBlock } from "@agent-ui-study/protocol"

import { Markdown } from "@/features/markdown/markdown"

import { ThinkingBlock } from "./thinking-block"
import { TodoCard } from "./todo-card"
import { ToolBlock } from "./tool-block"

export type BlockListProps = {
  blocks: ContentBlock[]
  streaming: boolean
  showThinking: boolean
  onOpenArtifact?: (artifactId: string) => void
}

/**
 * Draws an assistant message.
 *
 * Tool results are not drawn where they sit in the block list; they are folded
 * into the call they answer, so a call and its output are one card. And a
 * `set_todos` result becomes a checklist rather than a tool card, because the
 * plan is content the reader wants, not plumbing they can collapse.
 */
export function BlockList({
  blocks,
  streaming,
  showThinking,
  onOpenArtifact,
}: BlockListProps) {
  const results = new Map<string, ToolResultBlock>()

  for (const block of blocks) {
    if (block.type === "tool_result") results.set(block.tool_use_id, block)
  }

  const last = blocks.at(-1)

  return (
    <>
      {blocks.map((block, index) => {
        const isLast = index === blocks.length - 1

        if (block.type === "tool_result") return null

        if (block.type === "thinking") {
          if (!showThinking) return null

          return (
            <ThinkingBlock
              key={index}
              text={block.thinking}
              streaming={streaming && isLast}
            />
          )
        }

        if (block.type === "tool_use") {
          const result = results.get(block.id) ?? null

          if (block.name === "set_todos" && result?.detail?.kind === "todos") {
            return <TodoCard key={index} items={result.detail.items} />
          }

          return (
            <ToolBlock
              key={index}
              call={block}
              result={result}
              onOpenArtifact={onOpenArtifact}
            />
          )
        }

        return (
          <div key={index}>
            <Markdown text={block.text} />
            {streaming && isLast ? <span className="stream-caret" /> : null}
          </div>
        )
      })}

      {/* Between a tool finishing and the next block opening there is nothing
          to draw, and a reply that appears to have stalled reads as broken. */}
      {streaming && (blocks.length === 0 || last?.type === "tool_result") ? (
        <PendingDots />
      ) : null}
    </>
  )
}

function PendingDots() {
  return (
    <div className="flex items-center gap-1 py-2" aria-label="Working">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="size-1.5 animate-bounce rounded-full bg-text-faint"
          style={{ animationDelay: `${index * 130}ms` }}
        />
      ))}
    </div>
  )
}
