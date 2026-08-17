import { collect } from "@agent-ui-study/protocol"
import { describe, expect, it } from "vitest"

import { createScriptedProvider, chunkText } from "./providers/scripted"
import type { TurnMessage } from "./provider"
import { iterationOf, selectScenario } from "./scenario"
import { SCENARIOS } from "./scenarios"

const user = (text: string): TurnMessage => ({
  role: "user",
  content: [{ type: "text", text }],
})

const assistant = (text: string): TurnMessage => ({
  role: "assistant",
  content: [{ type: "text", text }],
})

const toolResults: TurnMessage = {
  role: "user",
  content: [{ type: "tool_result", tool_use_id: "toolu_1", content: "ok" }],
}

describe("iterationOf", () => {
  it("is zero on a fresh prompt", () => {
    expect(iterationOf([user("hello")])).toBe(0)
  })

  it("counts the passes since the last thing the user said", () => {
    expect(
      iterationOf([user("hello"), assistant("calling a tool"), toolResults])
    ).toBe(1)
  })

  it("resets when the user speaks again", () => {
    expect(
      iterationOf([user("hello"), assistant("hi"), user("and again")])
    ).toBe(0)
  })
})

describe("selectScenario", () => {
  it("picks the debugging script for a bug report", () => {
    const scenario = selectScenario(
      SCENARIOS,
      "the cart total is wrong with a discount"
    )

    expect(scenario?.id).toBe("debugging")
  })

  it("returns nothing for a prompt no script covers", () => {
    expect(selectScenario(SCENARIOS, "what is the capital of peru")).toBeNull()
  })
})

describe("chunkText", () => {
  it("keeps every character when the chunks are rejoined", () => {
    const text = "Two  spaces and\na newline."

    expect(chunkText(text).join("")).toBe(text)
  })
})

describe("createScriptedProvider", () => {
  const provider = createScriptedProvider({ chunkMs: 0 })

  const request = (
    messages: TurnMessage[],
    model: "deep" | "balanced" = "balanced"
  ) => ({
    model,
    system: "",
    messages,
    tools: [],
  })

  it("streams the first pass of the matched scenario", async () => {
    const message = await collect(
      provider.stream(
        request([user("the cart total is wrong with a discount")])
      )
    )

    expect(message.stopReason).toBe("tool_use")
    expect(message.content.some((block) => block.type === "tool_use")).toBe(
      true
    )
  })

  it("shows thinking only on the tier that reasons", async () => {
    const prompt = [user("the cart total is wrong with a discount")]

    const balanced = await collect(provider.stream(request(prompt, "balanced")))
    const deep = await collect(provider.stream(request(prompt, "deep")))

    expect(balanced.content.some((block) => block.type === "thinking")).toBe(
      false
    )
    expect(deep.content.some((block) => block.type === "thinking")).toBe(true)
  })

  it("falls back rather than inventing an answer it does not have", async () => {
    const message = await collect(
      provider.stream(request([user("who won in 1974")]))
    )

    expect(message.stopReason).toBe("end_turn")
    expect(message.content).toHaveLength(1)
  })

  it("replays the same run for the same history", async () => {
    const prompt = [
      user("should sales tax be calculated before or after a discount"),
    ]

    const first = await collect(provider.stream(request(prompt)))
    const second = await collect(provider.stream(request(prompt)))

    expect(first.content).toEqual(second.content)
  })
})
