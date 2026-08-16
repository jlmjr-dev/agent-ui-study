import type {
  ContentBlock,
  ModelId,
  StreamEvent,
  ToolDefinition,
} from "@agent-ui-study/protocol"

export type TurnMessage = {
  role: "user" | "assistant"
  content: ContentBlock[]
}

export type ProviderRequest = {
  model: ModelId
  system: string
  messages: TurnMessage[]
  tools: readonly ToolDefinition[]
  signal?: AbortSignal
}

/**
 * The seam the whole app is built on. A provider turns a request into a stream
 * of events; nothing above this line knows whether those events were scripted
 * locally or arrived over the network.
 */
export type Provider = {
  id: string
  label: string
  stream(request: ProviderRequest): AsyncIterable<StreamEvent>
}

export class AbortedError extends Error {
  constructor() {
    super("The run was stopped.")
    this.name = "AbortedError"
  }
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new AbortedError()
}

/** A cancellable pause, used to pace scripted output and tool latency. */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal)

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timer)
      reject(new AbortedError())
    }

    signal?.addEventListener("abort", onAbort, { once: true })
  })
}
