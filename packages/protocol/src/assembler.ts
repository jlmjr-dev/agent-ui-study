import type { ContentBlock } from "./content"
import type { StopReason, StreamEvent, Usage } from "./events"

export type AssembledMessage = {
  id: string
  model: string
  content: ContentBlock[]
  stopReason: StopReason | null
  usage: Usage
  error: string | null
}

export type Assembler = {
  handle(event: StreamEvent): void
  snapshot(): AssembledMessage
}

const EMPTY_USAGE: Usage = { input_tokens: 0, output_tokens: 0 }

/**
 * Folds a stream of events into a message.
 *
 * Two things make this less trivial than it looks. Tool inputs arrive as a
 * JSON string split across deltas, so they are buffered per index and parsed
 * once the block closes; a stream cut off mid-argument therefore leaves the
 * tool call present but with whatever object parsed, rather than throwing.
 * And `snapshot` returns a fresh array every call so React sees a new
 * reference for each frame of a stream.
 */
export function createAssembler(): Assembler {
  let id = ""
  let model = ""
  let stopReason: StopReason | null = null
  let usage: Usage = EMPTY_USAGE
  let error: string | null = null

  const blocks: ContentBlock[] = []
  const partialJson = new Map<number, string>()

  function settleToolInput(index: number) {
    const buffered = partialJson.get(index)
    const block = blocks[index]

    if (buffered === undefined || block?.type !== "tool_use") return

    partialJson.delete(index)

    try {
      const parsed: unknown = JSON.parse(buffered)

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        block.input = parsed as Record<string, unknown>
      }
    } catch {
      // An interrupted stream can leave the argument object half-written.
      // The call is still worth showing, so keep whatever it started with.
    }
  }

  return {
    handle(event) {
      switch (event.type) {
        case "message_start":
          id = event.message.id
          model = event.message.model
          break

        case "content_block_start":
          blocks[event.index] = structuredClone(event.content_block)
          if (event.content_block.type === "tool_use") {
            partialJson.set(event.index, "")
          }
          break

        case "content_block_delta": {
          const block = blocks[event.index]
          if (!block) break

          if (event.delta.type === "text_delta" && block.type === "text") {
            block.text += event.delta.text
          } else if (
            event.delta.type === "thinking_delta" &&
            block.type === "thinking"
          ) {
            block.thinking += event.delta.thinking
          } else if (event.delta.type === "input_json_delta") {
            const buffered = partialJson.get(event.index) ?? ""
            partialJson.set(event.index, buffered + event.delta.partial_json)
          }
          break
        }

        case "content_block_stop":
          settleToolInput(event.index)
          break

        case "message_delta":
          stopReason = event.delta.stop_reason
          usage = event.usage
          break

        case "message_stop":
          // Any block still open had no stop event of its own.
          for (const index of [...partialJson.keys()]) settleToolInput(index)
          break

        case "error":
          error = event.error.message
          break
      }
    },

    snapshot() {
      return {
        id,
        model,
        content: blocks.filter(Boolean).map((block) => ({ ...block })),
        stopReason,
        usage,
        error,
      }
    },
  }
}

/** Drains a whole stream into one message. Used by tests and the CLI paths. */
export async function collect(
  stream: AsyncIterable<StreamEvent>
): Promise<AssembledMessage> {
  const assembler = createAssembler()

  for await (const event of stream) assembler.handle(event)

  return assembler.snapshot()
}
