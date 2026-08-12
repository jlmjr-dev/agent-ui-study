import { describe, expect, it } from "vitest"

import { createAssembler } from "./assembler"
import type { StreamEvent } from "./events"

function run(events: StreamEvent[]) {
  const assembler = createAssembler()
  for (const event of events) assembler.handle(event)

  return assembler.snapshot()
}

const start: StreamEvent = {
  type: "message_start",
  message: { id: "msg_1", model: "balanced", role: "assistant" },
}

describe("createAssembler", () => {
  it("joins text deltas in order", () => {
    const result = run([
      start,
      {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "Hel" },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "lo" },
      },
      { type: "content_block_stop", index: 0 },
      { type: "message_stop" },
    ])

    expect(result.content).toEqual([{ type: "text", text: "Hello" }])
    expect(result.id).toBe("msg_1")
  })

  it("keeps thinking separate from the answer", () => {
    const result = run([
      start,
      {
        type: "content_block_start",
        index: 0,
        content_block: { type: "thinking", thinking: "" },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "thinking_delta", thinking: "weighing it" },
      },
      { type: "content_block_stop", index: 0 },
      {
        type: "content_block_start",
        index: 1,
        content_block: { type: "text", text: "" },
      },
      {
        type: "content_block_delta",
        index: 1,
        delta: { type: "text_delta", text: "done" },
      },
      { type: "content_block_stop", index: 1 },
      { type: "message_stop" },
    ])

    expect(result.content).toEqual([
      { type: "thinking", thinking: "weighing it" },
      { type: "text", text: "done" },
    ])
  })

  it("parses a tool input split across json deltas", () => {
    const result = run([
      start,
      {
        type: "content_block_start",
        index: 0,
        content_block: {
          type: "tool_use",
          id: "toolu_1",
          name: "read_file",
          input: {},
        },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "input_json_delta", partial_json: '{"path":' },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "input_json_delta", partial_json: '"src/a.ts"}' },
      },
      { type: "content_block_stop", index: 0 },
      {
        type: "message_delta",
        delta: { stop_reason: "tool_use" },
        usage: { input_tokens: 10, output_tokens: 4 },
      },
      { type: "message_stop" },
    ])

    expect(result.content[0]).toEqual({
      type: "tool_use",
      id: "toolu_1",
      name: "read_file",
      input: { path: "src/a.ts" },
    })
    expect(result.stopReason).toBe("tool_use")
    expect(result.usage.output_tokens).toBe(4)
  })

  it("keeps a tool call whose arguments were cut off mid-stream", () => {
    const result = run([
      start,
      {
        type: "content_block_start",
        index: 0,
        content_block: {
          type: "tool_use",
          id: "toolu_1",
          name: "read_file",
          input: {},
        },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "input_json_delta", partial_json: '{"path":"src/' },
      },
      { type: "message_stop" },
    ])

    expect(result.content[0]).toMatchObject({
      type: "tool_use",
      name: "read_file",
      input: {},
    })
  })

  it("hands back a new array each snapshot so a stream repaints", () => {
    const assembler = createAssembler()
    assembler.handle(start)
    assembler.handle({
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    })

    const first = assembler.snapshot()
    assembler.handle({
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "x" },
    })
    const second = assembler.snapshot()

    expect(first.content).not.toBe(second.content)
    expect(first.content[0]).not.toBe(second.content[0])
  })

  it("records a stream error without losing what arrived first", () => {
    const result = run([
      start,
      {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "partial" },
      },
      {
        type: "error",
        error: { type: "overloaded_error", message: "Overloaded" },
      },
    ])

    expect(result.error).toBe("Overloaded")
    expect(result.content).toEqual([{ type: "text", text: "partial" }])
  })
})
