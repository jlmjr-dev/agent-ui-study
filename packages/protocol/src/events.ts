import type { ContentBlock } from "./content"

/**
 * The event stream, modelled on the Messages API's server-sent events. A
 * provider is anything that yields these, which is what lets the scripted
 * runs and a real API call feed the exact same reducer.
 */

export type StopReason =
  "end_turn" | "tool_use" | "max_tokens" | "stop_sequence" | "refusal"

export type Usage = {
  input_tokens: number
  output_tokens: number
}

export type ContentBlockDelta =
  | { type: "text_delta"; text: string }
  | { type: "thinking_delta"; thinking: string }
  | { type: "input_json_delta"; partial_json: string }

export type StreamEvent =
  | {
      type: "message_start"
      message: { id: string; model: string; role: "assistant" }
    }
  | { type: "content_block_start"; index: number; content_block: ContentBlock }
  | { type: "content_block_delta"; index: number; delta: ContentBlockDelta }
  | { type: "content_block_stop"; index: number }
  | {
      type: "message_delta"
      delta: { stop_reason: StopReason | null }
      usage: Usage
    }
  | { type: "message_stop" }
  | { type: "error"; error: { type: string; message: string } }

export type EventStream = AsyncIterable<StreamEvent>
