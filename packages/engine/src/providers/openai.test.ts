import { collect, type ToolDefinition } from "@agent-ui-study/protocol"
import { describe, expect, it } from "vitest"

import type { ProviderRequest, TurnMessage } from "../provider"
import {
  createChunkMapper,
  createOpenAIProvider,
  createSseDecoder,
  openaiModelFor,
  toChatMessages,
  toChatTools,
} from "./openai"

/**
 * A response whose body is read exactly the way the provider reads it. Built
 * by hand rather than with `Response` so the test does not depend on which
 * fetch globals the jsdom environment happens to expose.
 */
function sseResponse(chunks: string[], status = 200, body = ""): Response {
  const encoder = new TextEncoder()
  let index = 0

  const reader = {
    read: () =>
      Promise.resolve(
        index < chunks.length
          ? { done: false, value: encoder.encode(chunks[index++]) }
          : { done: true, value: undefined }
      ),
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    text: () => Promise.resolve(body),
    body: status >= 200 && status < 300 ? { getReader: () => reader } : null,
  } as unknown as Response
}

function dataLines(chunks: object[]): string[] {
  return [
    ...chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`),
    "data: [DONE]\n\n",
  ]
}

const request: ProviderRequest = {
  model: "balanced",
  system: "You are a study rebuild.",
  messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
  tools: [],
}

describe("toChatMessages", () => {
  it("puts the system prompt first and drops it when empty", () => {
    expect(toChatMessages("be brief", [])).toEqual([
      { role: "system", content: "be brief" },
    ])
    expect(toChatMessages("   ", [])).toEqual([])
  })

  it("moves tool calls onto the assistant message as JSON strings", () => {
    const messages: TurnMessage[] = [
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "which file" },
          { type: "text", text: "Reading it." },
          {
            type: "tool_use",
            id: "call_1",
            name: "read_file",
            input: { path: "src/cart.ts" },
          },
        ],
      },
    ]

    expect(toChatMessages("", messages)).toEqual([
      {
        role: "assistant",
        content: "Reading it.",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: "read_file",
              arguments: JSON.stringify({ path: "src/cart.ts" }),
            },
          },
        ],
      },
    ])
  })

  it("skips an assistant turn that was only thinking", () => {
    const messages: TurnMessage[] = [
      { role: "assistant", content: [{ type: "thinking", thinking: "hm" }] },
    ]

    expect(toChatMessages("", messages)).toEqual([])
  })

  it("hoists tool results into their own messages, ahead of any user text", () => {
    const messages: TurnMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "call_1",
            content: "export function total() {}",
            detail: { kind: "listing", path: "src", entries: ["cart.ts"] },
          },
          {
            type: "tool_result",
            tool_use_id: "call_2",
            content: "no such file",
            is_error: true,
          },
          { type: "text", text: "and now fix it" },
        ],
      },
    ]

    expect(toChatMessages("", messages)).toEqual([
      {
        role: "tool",
        tool_call_id: "call_1",
        content: "export function total() {}",
      },
      { role: "tool", tool_call_id: "call_2", content: "Error: no such file" },
      { role: "user", content: "and now fix it" },
    ])
  })

  it("never sends the local detail annotation", () => {
    const messages: TurnMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "call_1",
            content: "ok",
            detail: { kind: "matches", query: "discount", count: 2 },
          },
        ],
      },
    ]

    expect(JSON.stringify(toChatMessages("", messages))).not.toContain("detail")
  })
})

describe("toChatTools", () => {
  it("renames input_schema to parameters and wraps each tool in a function", () => {
    const tools: ToolDefinition[] = [
      {
        name: "read_file",
        description: "Read a file",
        input_schema: {
          type: "object",
          properties: { path: { type: "string" } },
          required: ["path"],
        },
      },
    ]

    expect(toChatTools(tools)).toEqual([
      {
        type: "function",
        function: {
          name: "read_file",
          description: "Read a file",
          parameters: tools[0].input_schema,
        },
      },
    ])
  })
})

describe("openaiModelFor", () => {
  it("prefers the configured name and falls back to the default", () => {
    expect(openaiModelFor("swift", { swift: "llama3.1:8b" })).toBe(
      "llama3.1:8b"
    )
    expect(openaiModelFor("swift", { swift: "  " })).toBe("gpt-5-mini")
    expect(openaiModelFor("deep")).toBe("gpt-5")
  })
})

describe("createSseDecoder", () => {
  it("holds a line that arrives split across chunks", () => {
    const decoder = createSseDecoder()

    expect(decoder.push('data: {"a"')).toEqual([])
    expect(decoder.push(':1}\ndata: {"b":2}\n')).toEqual(['{"a":1}', '{"b":2}'])
  })

  it("ignores comments, blank lines and carriage returns", () => {
    const decoder = createSseDecoder()

    expect(decoder.push(': keepalive\r\n\r\ndata: {"a":1}\r\n')).toEqual([
      '{"a":1}',
    ])
  })
})

describe("createChunkMapper", () => {
  it("turns a run of content deltas into one text block", () => {
    const mapper = createChunkMapper("gpt-5")
    const events = [
      ...mapper.map({
        id: "chatcmpl_1",
        model: "gpt-5",
        choices: [{ delta: { content: "Hel" } }],
      }),
      ...mapper.map({ choices: [{ delta: { content: "lo" } }] }),
      ...mapper.map({ choices: [{ delta: {}, finish_reason: "stop" }] }),
      ...mapper.finish(),
    ]

    expect(
      events.filter((event) => event.type === "content_block_start")
    ).toHaveLength(1)
    expect(events.at(-1)).toEqual({ type: "message_stop" })
    expect(events.at(-2)).toEqual({
      type: "message_delta",
      delta: { stop_reason: "end_turn" },
      usage: { input_tokens: 0, output_tokens: 0 },
    })
  })

  it("opens the message with the id and model the server reports", () => {
    const mapper = createChunkMapper("fallback")

    expect(
      mapper.map({ id: "chatcmpl_9", model: "gpt-5", choices: [] })[0]
    ).toEqual({
      type: "message_start",
      message: { id: "chatcmpl_9", model: "gpt-5", role: "assistant" },
    })
  })

  it("closes the thinking block when the answer starts", () => {
    const mapper = createChunkMapper("gpt-5")
    const events = [
      ...mapper.map({
        choices: [{ delta: { reasoning_content: "checking" } }],
      }),
      ...mapper.map({ choices: [{ delta: { content: "Done." } }] }),
      ...mapper.finish(),
    ]

    const starts = events.filter(
      (event) => event.type === "content_block_start"
    )
    const stops = events.filter((event) => event.type === "content_block_stop")

    expect(starts.map((event) => event.content_block.type)).toEqual([
      "thinking",
      "text",
    ])
    expect(stops.map((event) => event.index)).toEqual([0, 1])
  })

  it("reads OpenRouter's reasoning field as well", () => {
    const mapper = createChunkMapper("gpt-5")
    const events = mapper.map({ choices: [{ delta: { reasoning: "hm" } }] })

    expect(events.at(-1)).toEqual({
      type: "content_block_delta",
      index: 0,
      delta: { type: "thinking_delta", thinking: "hm" },
    })
  })

  it("waits for a tool name before opening the block, then replays its arguments", () => {
    const mapper = createChunkMapper("gpt-5")
    const events = [
      // A server that sends the id before it has decided on the name.
      ...mapper.map({
        choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1" }] } }],
      }),
      ...mapper.map({
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  function: { name: "read_file", arguments: '{"pa' },
                },
              ],
            },
          },
        ],
      }),
      ...mapper.map({
        choices: [
          {
            delta: {
              tool_calls: [
                { index: 0, function: { arguments: 'th":"a.ts"}' } },
              ],
            },
          },
        ],
      }),
      ...mapper.finish(),
    ]

    const start = events.find((event) => event.type === "content_block_start")

    expect(start?.content_block).toEqual({
      type: "tool_use",
      id: "call_1",
      name: "read_file",
      input: {},
    })

    const json = events
      .filter((event) => event.type === "content_block_delta")
      .map((event) =>
        event.delta.type === "input_json_delta" ? event.delta.partial_json : ""
      )
      .join("")

    expect(JSON.parse(json)).toEqual({ path: "a.ts" })
  })

  it("keeps parallel calls on separate blocks", () => {
    const mapper = createChunkMapper("gpt-5")
    const events = [
      ...mapper.map({
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: "call_1",
                  function: { name: "read_file", arguments: "{}" },
                },
                {
                  index: 1,
                  id: "call_2",
                  function: { name: "list_files", arguments: "{}" },
                },
              ],
            },
          },
        ],
      }),
      ...mapper.finish(),
    ]

    const starts = events.filter(
      (event) => event.type === "content_block_start"
    )

    expect(starts.map((event) => event.index)).toEqual([0, 1])
    expect(
      events
        .filter((event) => event.type === "content_block_stop")
        .map((event) => event.index)
    ).toEqual([0, 1])
  })

  it("reports a turn that called a tool as tool_use even when the server said stop", () => {
    const mapper = createChunkMapper("gpt-5")

    mapper.map({
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: "call_1",
                function: { name: "read_file", arguments: "{}" },
              },
            ],
          },
          finish_reason: "stop",
        },
      ],
    })

    const done = mapper.finish().find((event) => event.type === "message_delta")

    expect(done?.delta.stop_reason).toBe("tool_use")
  })

  it("leaves a truncated call alone so the loop does not run it", () => {
    const mapper = createChunkMapper("gpt-5")

    mapper.map({
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: "call_1",
                function: { name: "read_file", arguments: '{"pa' },
              },
            ],
          },
          finish_reason: "length",
        },
      ],
    })

    const done = mapper.finish().find((event) => event.type === "message_delta")

    expect(done?.delta.stop_reason).toBe("max_tokens")
  })

  it("takes the last usage rather than adding every report up", () => {
    const mapper = createChunkMapper("gpt-5")

    mapper.map({
      choices: [],
      usage: { prompt_tokens: 10, completion_tokens: 1 },
    })
    mapper.map({
      choices: [],
      usage: { prompt_tokens: 10, completion_tokens: 4 },
    })

    const done = mapper.finish().find((event) => event.type === "message_delta")

    expect(done?.usage).toEqual({ input_tokens: 10, output_tokens: 4 })
  })
})

describe("createOpenAIProvider", () => {
  it("posts to the configured endpoint and assembles the reply", async () => {
    const calls: { url: string; init: RequestInit }[] = []

    const provider = createOpenAIProvider({
      apiKey: "sk-test",
      baseUrl: "http://localhost:11434/v1/",
      models: { balanced: "llama3.1:8b" },
      fetchImpl: (url, init) => {
        calls.push({ url: String(url), init: init as RequestInit })

        return Promise.resolve(
          sseResponse(
            dataLines([
              {
                id: "chatcmpl_1",
                model: "llama3.1:8b",
                choices: [{ delta: { content: "Hi" } }],
              },
              { choices: [{ delta: { content: " there" } }] },
              { choices: [{ delta: {}, finish_reason: "stop" }] },
              {
                choices: [],
                usage: { prompt_tokens: 12, completion_tokens: 3 },
              },
            ])
          )
        )
      },
    })

    const message = await collect(provider.stream(request))

    expect(calls[0].url).toBe("http://localhost:11434/v1/chat/completions")

    const sent = JSON.parse(String(calls[0].init.body)) as Record<
      string,
      unknown
    >

    expect(sent.model).toBe("llama3.1:8b")
    expect(sent.stream).toBe(true)
    expect(sent).not.toHaveProperty("reasoning_effort")
    expect(message.content).toEqual([{ type: "text", text: "Hi there" }])
    expect(message.stopReason).toBe("end_turn")
    expect(message.usage).toEqual({ input_tokens: 12, output_tokens: 3 })
  })

  it("asks for reasoning only on the tier that reasons", async () => {
    const bodies: string[] = []

    const provider = createOpenAIProvider({
      apiKey: "sk-test",
      effort: "medium",
      fetchImpl: (_url, init) => {
        bodies.push(String((init as RequestInit).body))

        return Promise.resolve(sseResponse(dataLines([])))
      },
    })

    await collect(provider.stream({ ...request, model: "deep" }))
    await collect(provider.stream({ ...request, model: "swift" }))

    expect(JSON.parse(bodies[0]).reasoning_effort).toBe("medium")
    expect(JSON.parse(bodies[1])).not.toHaveProperty("reasoning_effort")
  })

  it("reassembles a tool call that arrived across chunk boundaries", async () => {
    const provider = createOpenAIProvider({
      apiKey: "sk-test",
      fetchImpl: () =>
        Promise.resolve(
          sseResponse([
            'data: {"id":"chatcmpl_1","choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"read_file","argum',
            'ents":"{\\"path\\""}}]}}]}\n',
            'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":":\\"src/cart.ts\\"}"}}]},"finish_reason":"tool_calls"}]}\n',
            "data: [DONE]\n",
          ])
        ),
    })

    const message = await collect(provider.stream(request))

    expect(message.content).toEqual([
      {
        type: "tool_use",
        id: "call_1",
        name: "read_file",
        input: { path: "src/cart.ts" },
      },
    ])
    expect(message.stopReason).toBe("tool_use")
  })

  it("reports a rejected key as an error rather than an empty reply", async () => {
    const provider = createOpenAIProvider({
      apiKey: "nope",
      fetchImpl: () =>
        Promise.resolve(
          sseResponse(
            [],
            401,
            JSON.stringify({ error: { message: "Incorrect API key provided" } })
          )
        ),
    })

    const message = await collect(provider.stream(request))

    expect(message.error).toBe("401 Incorrect API key provided")
  })

  it("reports a failure that arrives inside the stream", async () => {
    const provider = createOpenAIProvider({
      apiKey: "sk-test",
      fetchImpl: () =>
        Promise.resolve(
          sseResponse(dataLines([{ error: { message: "model not found" } }]))
        ),
    })

    expect((await collect(provider.stream(request))).error).toContain(
      "model not found"
    )
  })

  it("says what went wrong when the endpoint cannot be reached", async () => {
    const provider = createOpenAIProvider({
      apiKey: "sk-test",
      fetchImpl: () => Promise.reject(new TypeError("Failed to fetch")),
    })

    expect((await collect(provider.stream(request))).error).toBe(
      "Failed to fetch"
    )
  })

  it("stays quiet when the run was stopped", async () => {
    const controller = new AbortController()
    const provider = createOpenAIProvider({
      apiKey: "sk-test",
      fetchImpl: () => {
        controller.abort()

        return Promise.reject(new DOMException("Aborted", "AbortError"))
      },
    })

    const message = await collect(
      provider.stream({ ...request, signal: controller.signal })
    )

    expect(message.error).toBeNull()
    expect(message.content).toEqual([])
  })
})
