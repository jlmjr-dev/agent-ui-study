import type { ContentBlock } from "@agent-ui-study/protocol"

import type { TurnMessage } from "./provider"

/**
 * A step is one content block the scripted assistant produces. A turn is the
 * list of steps for a single pass of the agent loop, so a scenario with three
 * turns is one that calls tools twice before it answers.
 */
export type ScriptedStep =
  | { type: "thinking"; text: string }
  | { type: "text"; text: string }
  | { type: "tool"; name: string; input: Record<string, unknown> }

export type Scenario = {
  id: string
  /** Shown in the "try this" list on an empty conversation. */
  prompt: string
  keywords: string[]
  turns: ScriptedStep[][]
}

/**
 * Which pass of the loop we are on, read off the history rather than kept in
 * the provider. A provider is a pure function of its request, which is what
 * makes replaying a conversation reproducible.
 */
export function iterationOf(messages: TurnMessage[]): number {
  let iteration = 0

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]

    if (message.role === "assistant") {
      iteration += 1
      continue
    }

    // A user message carrying only tool results is part of this same turn.
    if (message.content.some((block: ContentBlock) => block.type === "text")) {
      break
    }
  }

  return iteration
}

export function scoreScenario(scenario: Scenario, prompt: string): number {
  const needle = prompt.toLowerCase()

  return scenario.keywords.reduce(
    (score, keyword) =>
      needle.includes(keyword) ? score + keyword.length : score,
    0
  )
}

export function selectScenario(
  scenarios: readonly Scenario[],
  prompt: string
): Scenario | null {
  let best: Scenario | null = null
  let bestScore = 0

  for (const scenario of scenarios) {
    const score = scoreScenario(scenario, prompt)

    if (score > bestScore) {
      best = scenario
      bestScore = score
    }
  }

  return best
}

/** The last user prose in a history, which is what a scenario matches on. */
export function lastPrompt(messages: TurnMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.role !== "user") continue

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join(" ")

    if (text.trim()) return text
  }

  return ""
}
