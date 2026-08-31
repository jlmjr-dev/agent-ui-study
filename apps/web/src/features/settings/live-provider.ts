import {
  createLiveProvider,
  createOpenAIProvider,
  createScriptedProvider,
  type Provider,
} from "@agent-ui-study/engine"

import type { LiveProviderId, Settings } from "./settings-context"

export const LIVE_PROVIDERS: { id: LiveProviderId; label: string }[] = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai", label: "OpenAI compatible" },
]

/** The key the selected back end would use, which is not always `apiKey`. */
export function liveKey(settings: Settings): string {
  return settings.liveProvider === "openai"
    ? settings.openaiApiKey.trim()
    : settings.apiKey.trim()
}

/**
 * A key is what separates a live run from a scripted one. The toggle alone is
 * not enough: it can survive in localStorage after the key it belonged to was
 * cleared, and a run that fails on an empty Authorization header is a worse
 * answer than the scripts.
 */
export function isLive(settings: Settings): boolean {
  return settings.useLiveProvider && liveKey(settings).length > 0
}

/** Picks the provider for a turn. The only place the choice is made. */
export function providerFor(settings: Settings): Provider {
  if (!isLive(settings)) {
    return createScriptedProvider({ chunkMs: settings.instantStream ? 0 : 14 })
  }

  if (settings.liveProvider === "openai") {
    return createOpenAIProvider({
      apiKey: settings.openaiApiKey.trim(),
      baseUrl: settings.openaiBaseUrl,
      models: settings.openaiModels,
    })
  }

  return createLiveProvider({ apiKey: settings.apiKey.trim() })
}
