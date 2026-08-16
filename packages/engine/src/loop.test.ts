import {
  blocksOfType,
  collect,
  type StreamEvent,
} from "@agent-ui-study/protocol"
import { createFileSystem } from "@agent-ui-study/tools"
import { describe, expect, it } from "vitest"

import { runAgent } from "./loop"
import type { Provider, ProviderRequest } from "./provider"
import { iterationOf } from "./scenario"

/** A provider that replays a fixed script, one entry per pass of the loop. */
function scriptedProvider(passes: StreamEvent[][]): Provider {
  return {
    id: "test",
    label: "test",
    async *stream(request: ProviderRequest) {
      const pass = passes[iterationOf(request.messages)] ?? []
      yield* pass
    },
  }
}

/** A provider that never stops asking for tools, to test the ceiling. */
function loopingProvider(pass: StreamEvent[]): Provider {
  return {
    id: "test-loop",
    label: "test",
    async *stream() {
      yield* pass
    },
  }
}

const start: StreamEvent = {
  type: "message_start",
  message: { id: "msg_1", model: "balanced", role: "assistant" },
}

function text(index: number, value: string): StreamEvent[] {
  return [
    {
      type: "content_block_start",
      index,
      content_block: { type: "text", text: "" },
    },
    {
      type: "content_block_delta",
      index,
      delta: { type: "text_delta", text: value },
    },
    { type: "content_block_stop", index },
  ]
}

function toolCall(
  index: number,
  id: string,
  name: string,
  input: object
): StreamEvent[] {
  return [
    {
      type: "content_block_start",
      index,
      content_block: { type: "tool_use", id, name, input: {} },
    },
    {
      type: "content_block_delta",
      index,
      delta: { type: "input_json_delta", partial_json: JSON.stringify(input) },
    },
    { type: "content_block_stop", index },
  ]
}

const stop = (reason: "tool_use" | "end_turn"): StreamEvent[] => [
  {
    type: "message_delta",
    delta: { stop_reason: reason },
    usage: { input_tokens: 5, output_tokens: 7 },
  },
  { type: "message_stop" },
]

function run(passes: StreamEvent[][], signal?: AbortSignal) {
  return runAgent({
    provider: scriptedProvider(passes),
    context: { fs: createFileSystem({ "a.txt": "hello" }) },
    model: "balanced",
    system: "",
    messages: [
      { role: "user", content: [{ type: "text", text: "read a.txt" }] },
    ],
    tools: [],
    toolLatencyMs: 0,
    signal,
  })
}

describe("runAgent", () => {
  it("returns a plain answer untouched", async () => {
    const message = await collect(
      run([[start, ...text(0, "Hi there"), ...stop("end_turn")]])
    )

    expect(message.content).toEqual([{ type: "text", text: "Hi there" }])
    expect(message.stopReason).toBe("end_turn")
  })

  it("runs the tool and continues in the same message", async () => {
    const message = await collect(
      run([
        [
          start,
          ...text(0, "Reading it. "),
          ...toolCall(1, "toolu_1", "read_file", { path: "a.txt" }),
          ...stop("tool_use"),
        ],
        [start, ...text(0, "It says hello."), ...stop("end_turn")],
      ])
    )

    expect(message.content.map((block) => block.type)).toEqual([
      "text",
      "tool_use",
      "tool_result",
      "text",
    ])

    const [result] = blocksOfType(message.content, "tool_result")
    expect(result.tool_use_id).toBe("toolu_1")
    expect(result.content).toBe("hello")
    expect(result.is_error).toBe(false)
  })

  it("emits one message_start and one message_stop across passes", async () => {
    const events: StreamEvent[] = []

    for await (const event of run([
      [
        start,
        ...toolCall(0, "toolu_1", "read_file", { path: "a.txt" }),
        ...stop("tool_use"),
      ],
      [start, ...text(0, "done"), ...stop("end_turn")],
    ])) {
      events.push(event)
    }

    expect(
      events.filter((event) => event.type === "message_start")
    ).toHaveLength(1)
    expect(
      events.filter((event) => event.type === "message_stop")
    ).toHaveLength(1)
  })

  it("gives every block across passes a distinct index", async () => {
    const indices: number[] = []

    for await (const event of run([
      [
        start,
        ...text(0, "a"),
        ...toolCall(1, "toolu_1", "read_file", { path: "a.txt" }),
        ...stop("tool_use"),
      ],
      [start, ...text(0, "b"), ...stop("end_turn")],
    ])) {
      if ("index" in event) indices.push(event.index)
    }

    // Both passes number their blocks from zero; without re-indexing the
    // second pass would overwrite the first in the assembler.
    expect([...new Set(indices)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3])
  })

  it("sums usage over every pass", async () => {
    const message = await collect(
      run([
        [
          start,
          ...toolCall(0, "toolu_1", "read_file", { path: "a.txt" }),
          ...stop("tool_use"),
        ],
        [start, ...text(0, "done"), ...stop("end_turn")],
      ])
    )

    expect(message.usage).toEqual({ input_tokens: 10, output_tokens: 14 })
  })

  it("reports a failing tool without ending the run", async () => {
    const message = await collect(
      run([
        [
          start,
          ...toolCall(0, "toolu_1", "read_file", { path: "missing.txt" }),
          ...stop("tool_use"),
        ],
        [start, ...text(0, "That file is not there."), ...stop("end_turn")],
      ])
    )

    const [result] = blocksOfType(message.content, "tool_result")
    expect(result.is_error).toBe(true)
    expect(message.stopReason).toBe("end_turn")
  })

  it("stops the run when the caller aborts", async () => {
    const controller = new AbortController()

    const stream = runAgent({
      provider: scriptedProvider([
        [start, ...text(0, "one"), ...stop("tool_use")],
      ]),
      context: { fs: createFileSystem() },
      model: "balanced",
      system: "",
      messages: [{ role: "user", content: [{ type: "text", text: "go" }] }],
      tools: [],
      toolLatencyMs: 50,
      signal: controller.signal,
    })

    const events: StreamEvent[] = []
    for await (const event of stream) {
      events.push(event)
      if (event.type === "content_block_stop") controller.abort()
    }

    // A stopped run still closes cleanly, so the message settles rather than
    // hanging in a streaming state forever.
    expect(events.at(-1)).toEqual({ type: "message_stop" })
  })

  it("gives up after the iteration ceiling instead of looping forever", async () => {
    const message = await collect(
      runAgent({
        provider: loopingProvider([
          start,
          ...toolCall(0, "toolu_1", "read_file", { path: "a.txt" }),
          ...stop("tool_use"),
        ]),
        context: { fs: createFileSystem({ "a.txt": "hello" }) },
        model: "balanced",
        system: "",
        messages: [{ role: "user", content: [{ type: "text", text: "go" }] }],
        tools: [],
        toolLatencyMs: 0,
        maxIterations: 3,
      })
    )

    expect(blocksOfType(message.content, "tool_use")).toHaveLength(3)
    expect(message.stopReason).toBe("max_tokens")
  })
})
