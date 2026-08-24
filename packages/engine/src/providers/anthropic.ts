import {
  modelInfo,
  type ContentBlock,
  type StopReason,
  type StreamEvent,
} from "@agent-ui-study/protocol"

import type { Provider, ProviderRequest, TurnMessage } from "../provider"

export type LiveOptions = {
  apiKey: string
  /** Adaptive thinking is what surfaces the reasoning the "Deep" tier shows. */
  effort?: "low" | "medium" | "high"
}

/**
 * `detail` is this project's own annotation on a tool result, and the API
 * rejects unknown fields, so it comes off on the way out.
 */
function toWireContent(content: ContentBlock[]): unknown[] {
  return content.map((block) => {
    if (block.type !== "tool_result") return block

    const { detail: _detail, ...wire } = block

    return wire
  })
}

function toWireMessages(messages: TurnMessage[]): unknown[] {
  return messages.map((message) => ({
    role: message.role,
    content: toWireContent(message.content),
  }))
}

/**
 * The same interface, backed by the real Messages API.
 *
 * The SDK is imported dynamically for two reasons: it is the single largest
 * dependency in the app and most visitors never add a key, and it keeps the
 * entry chunk free of a module that only matters once the user opts in.
 *
 * `dangerouslyAllowBrowser` is exactly as alarming as it sounds. It is
 * acceptable here only because this is a keyless demo where the user pastes
 * their own key into their own browser and it never leaves it. A product
 * would proxy this through a server.
 */
export function createLiveProvider(options: LiveOptions): Provider {
  return {
    id: "anthropic",
    label: "Messages API",

    async *stream(request: ProviderRequest): AsyncGenerator<StreamEvent> {
      const { default: Anthropic } = await import("@anthropic-ai/sdk")

      const client = new Anthropic({
        apiKey: options.apiKey,
        dangerouslyAllowBrowser: true,
      })

      const model = modelInfo(request.model)

      const stream = client.messages.stream(
        {
          model: model.apiModel,
          max_tokens: 8000,
          system: request.system,
          messages: toWireMessages(request.messages) as Parameters<
            typeof client.messages.stream
          >[0]["messages"],
          tools: request.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.input_schema,
          })),
          ...(model.reasons
            ? {
                thinking: {
                  type: "adaptive" as const,
                  display: "summarized" as const,
                },
                output_config: { effort: options.effort ?? "high" },
              }
            : {}),
        },
        { signal: request.signal }
      )

      try {
        for await (const event of stream) {
          const mapped = mapEvent(event as unknown as RawEvent)
          if (mapped) yield mapped
        }
      } catch (error) {
        if (request.signal?.aborted) return

        yield {
          type: "error",
          error: {
            type: "api_error",
            message: error instanceof Error ? error.message : String(error),
          },
        }
      }
    },
  }
}

type RawEvent = { type: string } & Record<string, unknown>

/**
 * The SDK's events already carry these shapes; this narrows them to the union
 * this app understands and drops the ones it has no use for, so an SDK that
 * grows a new event type does not crash the renderer.
 */
function mapEvent(event: RawEvent): StreamEvent | null {
  switch (event.type) {
    case "message_start": {
      const message = event.message as { id: string; model: string }

      return {
        type: "message_start",
        message: { id: message.id, model: message.model, role: "assistant" },
      }
    }

    case "content_block_start": {
      const block = event.content_block as Record<string, unknown>
      const index = event.index as number

      if (block.type === "text") {
        return {
          type: "content_block_start",
          index,
          content_block: { type: "text", text: "" },
        }
      }

      if (block.type === "thinking") {
        return {
          type: "content_block_start",
          index,
          content_block: { type: "thinking", thinking: "" },
        }
      }

      if (block.type === "tool_use") {
        return {
          type: "content_block_start",
          index,
          content_block: {
            type: "tool_use",
            id: block.id as string,
            name: block.name as string,
            input: {},
          },
        }
      }

      return null
    }

    case "content_block_delta": {
      const delta = event.delta as Record<string, unknown>
      const index = event.index as number

      if (delta.type === "text_delta") {
        return {
          type: "content_block_delta",
          index,
          delta: { type: "text_delta", text: delta.text as string },
        }
      }

      if (delta.type === "thinking_delta") {
        return {
          type: "content_block_delta",
          index,
          delta: { type: "thinking_delta", thinking: delta.thinking as string },
        }
      }

      if (delta.type === "input_json_delta") {
        return {
          type: "content_block_delta",
          index,
          delta: {
            type: "input_json_delta",
            partial_json: delta.partial_json as string,
          },
        }
      }

      return null
    }

    case "content_block_stop":
      return { type: "content_block_stop", index: event.index as number }

    case "message_delta": {
      const delta = event.delta as { stop_reason: StopReason | null }
      const usage = event.usage as {
        input_tokens?: number
        output_tokens?: number
      }

      return {
        type: "message_delta",
        delta: { stop_reason: delta.stop_reason },
        usage: {
          input_tokens: usage?.input_tokens ?? 0,
          output_tokens: usage?.output_tokens ?? 0,
        },
      }
    }

    case "message_stop":
      return { type: "message_stop" }

    default:
      return null
  }
}
