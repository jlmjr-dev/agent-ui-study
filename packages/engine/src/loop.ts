import {
  blocksOfType,
  createAssembler,
  type StopReason,
  type StreamEvent,
  type ToolResultBlock,
  type Usage,
} from "@agent-ui-study/protocol"
import { executeTool, type ToolContext } from "@agent-ui-study/tools"

import {
  AbortedError,
  delay,
  type Provider,
  type ProviderRequest,
} from "./provider"

export type RunAgentOptions = ProviderRequest & {
  provider: Provider
  context: ToolContext
  /** How long a tool appears to run, so its card is visibly pending. */
  toolLatencyMs?: number
  maxIterations?: number
}

const DEFAULT_MAX_ITERATIONS = 8

/**
 * The agent loop, as one flat event stream.
 *
 * On the wire a tool round trip is several messages: assistant asks, user
 * replies with results, assistant continues. On screen it is a single reply
 * that happens to have done some work in the middle, which is how all three
 * products present it. So this loop keeps talking to the provider until it
 * stops asking for tools, and re-indexes every block into one continuous
 * message: the caller's assembler sees one `message_start`, one `message_stop`
 * and a growing list of blocks in between.
 */
export async function* runAgent(
  options: RunAgentOptions
): AsyncGenerator<StreamEvent> {
  const {
    provider,
    context,
    signal,
    toolLatencyMs = 260,
    maxIterations = DEFAULT_MAX_ITERATIONS,
    ...request
  } = options

  const history = [...request.messages]
  const usage: Usage = { input_tokens: 0, output_tokens: 0 }

  let offset = 0
  let stopReason: StopReason | null = null

  try {
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const assembler = createAssembler()

      for await (const event of provider.stream({
        ...request,
        signal,
        messages: history,
      })) {
        assembler.handle(event)

        switch (event.type) {
          case "message_start":
            // Only the first iteration opens the message the user sees.
            if (iteration === 0) yield event
            break

          case "message_delta":
            stopReason = event.delta.stop_reason
            usage.input_tokens += event.usage.input_tokens
            usage.output_tokens += event.usage.output_tokens
            break

          case "message_stop":
            // Held back: the run is not over while tools are still pending.
            break

          case "error":
            yield event
            return

          default:
            yield { ...event, index: event.index + offset }
        }
      }

      const turn = assembler.snapshot()
      offset += turn.content.length
      history.push({ role: "assistant", content: turn.content })

      const calls = blocksOfType(turn.content, "tool_use")

      if (stopReason !== "tool_use" || calls.length === 0) break

      const results: ToolResultBlock[] = []

      for (const call of calls) {
        if (toolLatencyMs > 0) await delay(toolLatencyMs, signal)

        const outcome = executeTool(call.name, call.input, context)
        const block: ToolResultBlock = {
          type: "tool_result",
          tool_use_id: call.id,
          content: outcome.content,
          is_error: outcome.isError,
          detail: outcome.detail,
        }

        results.push(block)
        yield {
          type: "content_block_start",
          index: offset,
          content_block: block,
        }
        yield { type: "content_block_stop", index: offset }
        offset += 1
      }

      // Results go back as a user turn, exactly as the API expects them, and
      // all of them in one message so parallel calls stay parallel.
      history.push({ role: "user", content: results })

      if (iteration === maxIterations - 1) stopReason = "max_tokens"
    }
  } catch (error) {
    if (error instanceof AbortedError) {
      yield { type: "message_delta", delta: { stop_reason: null }, usage }
      yield { type: "message_stop" }
      return
    }

    yield {
      type: "error",
      error: {
        type: "engine_error",
        message: error instanceof Error ? error.message : String(error),
      },
    }
    return
  }

  yield { type: "message_delta", delta: { stop_reason: stopReason }, usage }
  yield { type: "message_stop" }
}
