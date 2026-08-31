import {
  blocksOfType,
  modelInfo,
  textOf,
  type JsonSchema,
  type ModelId,
  type StopReason,
  type StreamEvent,
  type ToolDefinition,
  type Usage,
} from "@agent-ui-study/protocol"

import type { Provider, ProviderRequest, TurnMessage } from "../provider"

const DEFAULT_BASE_URL = "https://api.openai.com/v1"

/**
 * Defaults for api.openai.com. Every other compatible endpoint names its
 * models differently, which is why the tier mapping is a setting here and a
 * constant on the Anthropic side.
 */
export const DEFAULT_OPENAI_MODELS: Record<ModelId, string> = {
  swift: "gpt-5-mini",
  balanced: "gpt-5",
  deep: "gpt-5",
}

export type OpenAIOptions = {
  apiKey: string
  /** Anything speaking Chat Completions, up to and including the version. */
  baseUrl?: string
  /** What to send for each tier. Missing tiers fall back to the defaults. */
  models?: Partial<Record<ModelId, string>>
  /** Sent only for the tier that reasons, mirroring the Anthropic provider. */
  effort?: "low" | "medium" | "high"
  /**
   * Left off by default. Servers disagree about `max_tokens` versus
   * `max_completion_tokens`, and the one thing they all handle is neither.
   */
  maxTokens?: number
  label?: string
  /** The seam the tests use, so none of this needs a key or a network. */
  fetchImpl?: typeof fetch
}

/* -------------------------------------------------------------------------
 * The request
 * ---------------------------------------------------------------------- */

export type ChatToolCall = {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool"
  content: string | null
  tool_call_id?: string
  tool_calls?: ChatToolCall[]
}

export type ChatTool = {
  type: "function"
  function: { name: string; description: string; parameters: JsonSchema }
}

/**
 * The interesting half of the adapter.
 *
 * This project's conversation is Anthropic-shaped: one message holds text,
 * tool calls and tool results side by side as blocks. Chat Completions wants
 * that history flattened. Calls become `tool_calls` on the assistant message,
 * and every result becomes a message of its own, so the turn the agent loop
 * writes as two messages can come out here as four or five.
 *
 * Two things are lost on the way out, both deliberately. `detail` is this
 * project's own annotation on a tool result and never belonged on the wire.
 * Thinking is dropped because there is nowhere to put it: the Messages API
 * takes reasoning back as blocks, Chat Completions has no field for it.
 */
export function toChatMessages(
  system: string,
  messages: TurnMessage[]
): ChatMessage[] {
  const out: ChatMessage[] = []

  if (system.trim()) out.push({ role: "system", content: system })

  for (const message of messages) {
    if (message.role === "assistant") {
      const text = textOf(message.content)
      const calls: ChatToolCall[] = blocksOfType(
        message.content,
        "tool_use"
      ).map((block) => ({
        id: block.id,
        type: "function",
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input),
        },
      }))

      // An assistant turn that was only thinking has nothing to send.
      if (!text && calls.length === 0) continue

      out.push({
        role: "assistant",
        content: text || null,
        ...(calls.length > 0 ? { tool_calls: calls } : {}),
      })

      continue
    }

    // Results answer the assistant message above them, so they go first: a
    // user turn carrying both would otherwise separate a call from its result.
    for (const result of blocksOfType(message.content, "tool_result")) {
      out.push({
        role: "tool",
        tool_call_id: result.tool_use_id,
        // There is no `is_error` on a tool message, and a failure the model
        // cannot see is a failure it will repeat, so it goes in the text.
        content: result.is_error ? `Error: ${result.content}` : result.content,
      })
    }

    const text = textOf(message.content)
    if (text) out.push({ role: "user", content: text })
  }

  return out
}

export function toChatTools(tools: readonly ToolDefinition[]): ChatTool[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }))
}

export function openaiModelFor(
  id: ModelId,
  models?: Partial<Record<ModelId, string>>
): string {
  return models?.[id]?.trim() || DEFAULT_OPENAI_MODELS[id]
}

/* -------------------------------------------------------------------------
 * The response
 * ---------------------------------------------------------------------- */

type DeltaToolCall = {
  index?: number
  id?: string
  function?: { name?: string; arguments?: string }
}

export type ChatChunk = {
  id?: string
  model?: string
  choices?: {
    delta?: {
      content?: string | null
      /** Not in the spec. What DeepSeek and vLLM call reasoning. */
      reasoning_content?: string | null
      /** Not in the spec either. What OpenRouter calls it. */
      reasoning?: unknown
      tool_calls?: DeltaToolCall[]
    } | null
    finish_reason?: string | null
  }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null
}

/**
 * Reads a line-oriented `data:` stream. Buffers because a chunk boundary lands
 * mid-line often enough that not buffering works right up until it does not.
 * Chat Completions puts one JSON object on each line, so the multi-line
 * concatenation SSE allows never comes up.
 */
export function createSseDecoder(): { push(text: string): string[] } {
  let buffer = ""

  return {
    push(text: string): string[] {
      buffer += text

      const payloads: string[] = []

      for (
        let cut = buffer.indexOf("\n");
        cut !== -1;
        cut = buffer.indexOf("\n")
      ) {
        const line = buffer.slice(0, cut).replace(/\r$/, "")
        buffer = buffer.slice(cut + 1)

        if (line.startsWith("data:")) payloads.push(line.slice(5).trim())
      }

      return payloads
    },
  }
}

function toStopReason(reason: string | null | undefined): StopReason | null {
  switch (reason) {
    case "stop":
      return "end_turn"
    case "tool_calls":
    case "function_call":
      return "tool_use"
    case "length":
      return "max_tokens"
    case "content_filter":
      return "refusal"
    default:
      return null
  }
}

function reasoningOf(delta: {
  reasoning_content?: string | null
  reasoning?: unknown
}): string {
  if (delta.reasoning_content) return delta.reasoning_content
  if (typeof delta.reasoning === "string") return delta.reasoning

  return ""
}

type PendingCall = {
  id: string
  name: string
  /** The content index once opened, null while the name is still unknown. */
  index: number | null
  buffered: string
}

export type ChunkMapper = {
  map(chunk: ChatChunk): StreamEvent[]
  finish(): StreamEvent[]
}

/**
 * Chat Completions chunks into this project's events.
 *
 * The bookkeeping exists because the two formats disagree about what an index
 * is. Anthropic numbers content blocks and tells you when each opens and
 * closes; Chat Completions numbers only tool calls, and a run of text has no
 * boundaries at all, so the block starts and stops are inferred here from the
 * first delta of each kind and from the end of the stream.
 */
export function createChunkMapper(fallbackModel: string): ChunkMapper {
  const calls = new Map<number, PendingCall>()
  const openedTools: number[] = []
  const usage: Usage = { input_tokens: 0, output_tokens: 0 }

  let started = false
  let next = 0
  let prose: { type: "text" | "thinking"; index: number } | null = null
  let stopReason: StopReason | null = null
  let sawToolUse = false

  function closeProse(events: StreamEvent[]) {
    if (!prose) return

    events.push({ type: "content_block_stop", index: prose.index })
    prose = null
  }

  function writeProse(
    type: "text" | "thinking",
    text: string,
    events: StreamEvent[]
  ) {
    if (prose?.type !== type) {
      closeProse(events)

      prose = { type, index: next }
      next += 1

      events.push({
        type: "content_block_start",
        index: prose.index,
        content_block:
          type === "text"
            ? { type: "text", text: "" }
            : { type: "thinking", thinking: "" },
      })
    }

    events.push({
      type: "content_block_delta",
      index: prose.index,
      delta:
        type === "text"
          ? { type: "text_delta", text }
          : { type: "thinking_delta", thinking: text },
    })
  }

  function writeCall(call: DeltaToolCall, events: StreamEvent[]) {
    const wire = call.index ?? 0
    const pending: PendingCall = calls.get(wire) ?? {
      id: "",
      name: "",
      index: null,
      buffered: "",
    }

    calls.set(wire, pending)

    if (call.id) pending.id = call.id
    // Appended rather than assigned: a server that splits the name across
    // chunks is rare, but losing half of it would call the wrong tool.
    if (call.function?.name) pending.name += call.function.name

    const args = call.function?.arguments ?? ""

    if (pending.index === null) {
      // A block cannot be opened without a name, and the arguments sometimes
      // start arriving in the same chunk that carries it.
      if (!pending.name) {
        pending.buffered += args
        return
      }

      closeProse(events)

      pending.index = next
      next += 1
      openedTools.push(pending.index)
      sawToolUse = true

      events.push({
        type: "content_block_start",
        index: pending.index,
        content_block: {
          type: "tool_use",
          id: pending.id || `call_${pending.index}`,
          name: pending.name,
          input: {},
        },
      })

      if (pending.buffered) {
        events.push({
          type: "content_block_delta",
          index: pending.index,
          delta: {
            type: "input_json_delta",
            partial_json: pending.buffered,
          },
        })
        pending.buffered = ""
      }
    }

    if (args) {
      events.push({
        type: "content_block_delta",
        index: pending.index,
        delta: { type: "input_json_delta", partial_json: args },
      })
    }
  }

  return {
    map(chunk) {
      const events: StreamEvent[] = []

      if (!started) {
        started = true
        events.push({
          type: "message_start",
          message: {
            id: chunk.id || "chatcmpl",
            model: chunk.model || fallbackModel,
            role: "assistant",
          },
        })
      }

      // Usage is cumulative for the whole response, so it is replaced rather
      // than accumulated: servers differ on whether it comes once or on
      // every chunk, and adding it up would triple-count the talkative ones.
      if (chunk.usage) {
        usage.input_tokens = chunk.usage.prompt_tokens ?? usage.input_tokens
        usage.output_tokens =
          chunk.usage.completion_tokens ?? usage.output_tokens
      }

      for (const choice of chunk.choices ?? []) {
        const delta = choice.delta

        if (delta) {
          const reasoning = reasoningOf(delta)
          if (reasoning) writeProse("thinking", reasoning, events)

          if (delta.content) writeProse("text", delta.content, events)

          for (const call of delta.tool_calls ?? []) writeCall(call, events)
        }

        const reason = toStopReason(choice.finish_reason)
        if (reason) stopReason = reason
      }

      return events
    },

    finish() {
      const events: StreamEvent[] = []

      if (!started) {
        started = true
        events.push({
          type: "message_start",
          message: { id: "chatcmpl", model: fallbackModel, role: "assistant" },
        })
      }

      closeProse(events)

      for (const index of openedTools) {
        events.push({ type: "content_block_stop", index })
      }

      openedTools.length = 0

      // Some compatible servers end a turn that asked for tools with `stop`.
      // The agent loop reads the stop reason to decide whether to run them, so
      // a turn that produced a call is reported as one whatever the server
      // said. `length` is left alone: a call cut off mid-arguments should not
      // be executed.
      const finished =
        sawToolUse && (stopReason === "end_turn" || stopReason === null)
          ? "tool_use"
          : stopReason

      events.push({
        type: "message_delta",
        delta: { stop_reason: finished },
        usage,
      })
      events.push({ type: "message_stop" })

      return events
    },
  }
}

/* -------------------------------------------------------------------------
 * The provider
 * ---------------------------------------------------------------------- */

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Pulls the human half out of an error body, whatever shape it arrived in. */
function describeBody(body: string): string {
  try {
    const parsed: unknown = JSON.parse(body)

    if (parsed && typeof parsed === "object") {
      const record = parsed as { error?: unknown; message?: unknown }
      const inner = record.error

      if (typeof inner === "string") return inner
      if (inner && typeof inner === "object") {
        const message = (inner as { message?: unknown }).message
        if (typeof message === "string") return message
      }

      if (typeof record.message === "string") return record.message
    }
  } catch {
    // Not JSON. A proxy in front of the API can answer in HTML.
  }

  return body.slice(0, 300)
}

/**
 * The same interface again, this time over Chat Completions.
 *
 * There is no SDK here on purpose. The whole protocol this needs is one POST
 * and a `data:` stream, and the endpoint is a setting, so a client library
 * would add weight, pin one vendor's idea of the schema, and buy nothing. It
 * means this provider costs the bundle nothing until someone selects it.
 *
 * The key sits in the browser and is sent from the page, with everything that
 * implies. It is acceptable for the same reason it is on the Anthropic side,
 * and unacceptable for the same reasons in anything that is not a demo.
 */
export function createOpenAIProvider(options: OpenAIOptions): Provider {
  const baseUrl = (options.baseUrl?.trim() || DEFAULT_BASE_URL).replace(
    /\/+$/,
    ""
  )

  return {
    id: "openai",
    label: options.label ?? "Chat Completions",

    async *stream(request: ProviderRequest): AsyncGenerator<StreamEvent> {
      const send = options.fetchImpl ?? globalThis.fetch
      const model = openaiModelFor(request.model, options.models)
      const body = {
        model,
        messages: toChatMessages(request.system, request.messages),
        stream: true,
        stream_options: { include_usage: true },
        ...(request.tools.length > 0
          ? { tools: toChatTools(request.tools) }
          : {}),
        ...(modelInfo(request.model).reasons
          ? { reasoning_effort: options.effort ?? "high" }
          : {}),
        ...(options.maxTokens
          ? { max_completion_tokens: options.maxTokens }
          : {}),
      }

      let response: Response

      try {
        response = await send(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${options.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: request.signal,
        })
      } catch (error) {
        if (request.signal?.aborted) return

        yield {
          type: "error",
          error: { type: "network_error", message: messageOf(error) },
        }
        return
      }

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "")

        yield {
          type: "error",
          error: {
            type: "api_error",
            message: text
              ? `${response.status} ${describeBody(text)}`
              : `${response.status} ${response.statusText}`,
          },
        }
        return
      }

      const mapper = createChunkMapper(model)
      const decoder = createSseDecoder()
      const reader = response.body.getReader()
      const text = new TextDecoder()

      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break

          for (const payload of decoder.push(
            text.decode(value, { stream: true })
          )) {
            if (!payload || payload === "[DONE]") continue

            let chunk: ChatChunk & { error?: unknown }

            try {
              chunk = JSON.parse(payload) as ChatChunk
            } catch {
              // A keepalive or a line this adapter has no use for.
              continue
            }

            // An endpoint that has already committed to 200 reports a failure
            // inside the stream instead.
            if (chunk.error) {
              yield {
                type: "error",
                error: {
                  type: "api_error",
                  message: describeBody(JSON.stringify(chunk)),
                },
              }
              return
            }

            yield* mapper.map(chunk)
          }
        }
      } catch (error) {
        if (request.signal?.aborted) return

        yield {
          type: "error",
          error: { type: "network_error", message: messageOf(error) },
        }
        return
      }

      yield* mapper.finish()
    },
  }
}
