import { DEFAULT_OPENAI_MODELS } from "@agent-ui-study/engine"
import { describe, expect, it } from "vitest"

import { isLive, liveKey, providerFor } from "./live-provider"
import { OPENAI_BASE_URL, type Settings } from "./settings-context"

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    theme: "system",
    useLiveProvider: false,
    liveProvider: "anthropic",
    apiKey: "",
    openaiApiKey: "",
    openaiBaseUrl: OPENAI_BASE_URL,
    openaiModels: { ...DEFAULT_OPENAI_MODELS },
    showThinking: true,
    instantStream: false,
    sidebarOpen: true,
    ...overrides,
  }
}

describe("liveKey", () => {
  it("reads the key belonging to the selected provider", () => {
    const both = { apiKey: "sk-ant-1", openaiApiKey: "sk-2" }

    expect(liveKey(settings({ ...both, liveProvider: "anthropic" }))).toBe(
      "sk-ant-1"
    )
    expect(liveKey(settings({ ...both, liveProvider: "openai" }))).toBe("sk-2")
  })
})

describe("providerFor", () => {
  it("scripts the run when nothing is configured", () => {
    expect(providerFor(settings()).id).toBe("scripted")
  })

  it("scripts the run when the toggle is on but its key is gone", () => {
    const stale = settings({
      useLiveProvider: true,
      liveProvider: "openai",
      apiKey: "sk-ant-1",
      openaiApiKey: "   ",
    })

    expect(isLive(stale)).toBe(false)
    expect(providerFor(stale).id).toBe("scripted")
  })

  it("uses the provider the settings name", () => {
    expect(
      providerFor(
        settings({
          useLiveProvider: true,
          liveProvider: "openai",
          openaiApiKey: "sk-2",
        })
      ).id
    ).toBe("openai")

    expect(
      providerFor(
        settings({
          useLiveProvider: true,
          liveProvider: "anthropic",
          apiKey: "sk-ant-1",
        })
      ).id
    ).toBe("anthropic")
  })
})
