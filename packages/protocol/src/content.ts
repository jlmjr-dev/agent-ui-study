import type { ToolDetail } from "./tools"

/**
 * Content blocks are snake_case on purpose: these are the wire shapes the
 * Messages API uses, not a local invention. Keeping them identical means the
 * live provider can hand its blocks straight to the renderer.
 */

export type TextBlock = {
  type: "text"
  text: string
}

export type ThinkingBlock = {
  type: "thinking"
  thinking: string
}

export type ToolUseBlock = {
  type: "tool_use"
  id: string
  name: string
  input: Record<string, unknown>
}

export type ToolResultBlock = {
  type: "tool_result"
  tool_use_id: string
  content: string
  is_error?: boolean
  /**
   * A local annotation, not part of the wire format: it is what lets a tool
   * card draw a diff or a listing instead of a wall of text. The live provider
   * strips it before sending results back to the API.
   */
  detail?: ToolDetail
}

export type ContentBlock =
  TextBlock | ThinkingBlock | ToolUseBlock | ToolResultBlock

export type ContentBlockOf<T extends ContentBlock["type"]> = Extract<
  ContentBlock,
  { type: T }
>

export function blocksOfType<T extends ContentBlock["type"]>(
  blocks: ContentBlock[],
  type: T
): ContentBlockOf<T>[] {
  return blocks.filter(
    (block): block is ContentBlockOf<T> => block.type === type
  )
}

/** The plain text of a message, with thinking and tool traffic dropped. */
export function textOf(blocks: ContentBlock[]): string {
  return blocksOfType(blocks, "text")
    .map((block) => block.text)
    .join("")
}

export function hasPendingToolUse(blocks: ContentBlock[]): boolean {
  const results = new Set(
    blocksOfType(blocks, "tool_result").map((block) => block.tool_use_id)
  )

  return blocksOfType(blocks, "tool_use").some(
    (block) => !results.has(block.id)
  )
}
