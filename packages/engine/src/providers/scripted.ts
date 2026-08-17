import {
  modelInfo,
  type StreamEvent,
  type ToolUseBlock,
} from "@agent-ui-study/protocol"

import { delay, type Provider, type ProviderRequest } from "../provider"
import {
  iterationOf,
  lastPrompt,
  selectScenario,
  type Scenario,
  type ScriptedStep,
} from "../scenario"
import { FALLBACK_TURNS, SCENARIOS } from "../scenarios"

export type ScriptedOptions = {
  scenarios?: readonly Scenario[]
  /** Milliseconds between chunks. Zero makes the whole stream synchronous. */
  chunkMs?: number
}

/**
 * Text is chunked on whitespace rather than per character. Per-character
 * streaming is a lie about how a model actually emits tokens and it repaints
 * far more often than it needs to; a word at a time looks right and costs a
 * fraction of the renders.
 */
export function chunkText(text: string): string[] {
  return text.match(/\s*\S+|\s+/g) ?? []
}

/** Tool arguments arrive split, the way the API splits them. */
function chunkJson(input: Record<string, unknown>): string[] {
  const json = JSON.stringify(input)
  const chunks: string[] = []
  const size = Math.max(12, Math.ceil(json.length / 6))

  for (let index = 0; index < json.length; index += size) {
    chunks.push(json.slice(index, index + size))
  }

  return chunks
}

/**
 * Ids are derived, not random. A scripted provider that returned a different
 * id each time would not be a pure function of its request, and replaying a
 * conversation to rebuild it after an edit would produce a different tree.
 */
function stableId(prefix: string, seed: string): string {
  let hash = 0x811c9dc5

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }

  return `${prefix}_${hash.toString(16).padStart(8, "0")}`
}

async function* streamStep(
  step: ScriptedStep,
  index: number,
  chunkMs: number,
  seed: string,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  if (step.type === "tool") {
    const block: ToolUseBlock = {
      type: "tool_use",
      id: stableId("toolu", `${seed}:${index}:${step.name}`),
      name: step.name,
      input: {},
    }

    yield { type: "content_block_start", index, content_block: block }

    for (const partial of chunkJson(step.input)) {
      if (chunkMs > 0) await delay(chunkMs, signal)
      yield {
        type: "content_block_delta",
        index,
        delta: { type: "input_json_delta", partial_json: partial },
      }
    }

    yield { type: "content_block_stop", index }
    return
  }

  const isThinking = step.type === "thinking"

  yield {
    type: "content_block_start",
    index,
    content_block: isThinking
      ? { type: "thinking", thinking: "" }
      : { type: "text", text: "" },
  }

  for (const chunk of chunkText(step.text)) {
    if (chunkMs > 0) await delay(chunkMs, signal)
    yield {
      type: "content_block_delta",
      index,
      delta: isThinking
        ? { type: "thinking_delta", thinking: chunk }
        : { type: "text_delta", text: chunk },
    }
  }

  yield { type: "content_block_stop", index }
}

/**
 * The default provider: deterministic conversations replayed as a stream. It
 * is a pure function of its request, so the same history always produces the
 * same run, and it emits exactly the events the live provider emits.
 */
export function createScriptedProvider(
  options: ScriptedOptions = {}
): Provider {
  const { scenarios = SCENARIOS, chunkMs = 14 } = options

  return {
    id: "scripted",
    label: "Scripted",

    async *stream(request: ProviderRequest) {
      const prompt = lastPrompt(request.messages)
      const scenario = selectScenario(scenarios, prompt)
      const turns = scenario?.turns ?? FALLBACK_TURNS
      const iteration = iterationOf(request.messages)

      // A scenario that runs out of scripted turns has finished talking.
      const steps = turns[iteration] ?? []
      const reasons = modelInfo(request.model).reasons

      const seed = `${scenario?.id ?? "fallback"}:${iteration}`

      yield {
        type: "message_start",
        message: {
          id: stableId("msg", `${seed}:${prompt}`),
          model: request.model,
          role: "assistant",
        },
      }

      let index = 0

      for (const step of steps) {
        // Thinking is written into every scenario, and shown only on the tier
        // that reasons. The cheaper tiers answer from the same script.
        if (step.type === "thinking" && !reasons) continue

        yield* streamStep(step, index, chunkMs, seed, request.signal)
        index += 1
      }

      const usesTool = steps.some((step) => step.type === "tool")

      yield {
        type: "message_delta",
        delta: { stop_reason: usesTool ? "tool_use" : "end_turn" },
        usage: {
          input_tokens: Math.round(prompt.length / 4),
          output_tokens: steps.reduce(
            (total, step) =>
              total +
              (step.type === "tool" ? 24 : Math.round(step.text.length / 4)),
            0
          ),
        },
      }

      yield { type: "message_stop" }
    },
  }
}
