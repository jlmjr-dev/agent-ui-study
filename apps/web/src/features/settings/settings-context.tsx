import { DEFAULT_OPENAI_MODELS } from "@agent-ui-study/engine"
import type { ModelId } from "@agent-ui-study/protocol"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { readJson, writeJson } from "@/services/storage"
import { DESKTOP_QUERY } from "@/shared/hooks/use-media-query"

const SETTINGS_KEY = "aus:settings"

export const OPENAI_BASE_URL = "https://api.openai.com/v1"

export type ThemePreference = "light" | "dark" | "system"

/**
 * Which live back end the provider seam is pointed at. Everything that speaks
 * Chat Completions is one entry, since the difference between those endpoints
 * is a base URL and a model name rather than a protocol.
 */
export type LiveProviderId = "anthropic" | "openai"

export type Settings = {
  theme: ThemePreference
  useLiveProvider: boolean
  liveProvider: LiveProviderId
  /**
   * Kept in localStorage because there is nowhere else to put it in a
   * frontend-only build. The settings screen says so in as many words.
   *
   * One key per provider: a single field would log you out of one back end
   * every time you tried the other.
   */
  apiKey: string
  openaiApiKey: string
  openaiBaseUrl: string
  /** Which model each tier sends, because no two endpoints agree on names. */
  openaiModels: Record<ModelId, string>
  showThinking: boolean
  instantStream: boolean
  sidebarOpen: boolean
}

/**
 * The sidebar's default depends on the screen it first opens on. A drawer that
 * covers the whole app is the wrong thing to greet a phone with, and a
 * hard-coded `true` does exactly that.
 */
function defaults(): Settings {
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
    sidebarOpen:
      typeof window === "undefined" || window.matchMedia(DESKTOP_QUERY).matches,
  }
}

type SettingsValue = {
  settings: Settings
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  reset: () => void
}

const SettingsContext = createContext<SettingsValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => ({
    ...defaults(),
    ...readJson<Partial<Settings>>(SETTINGS_KEY, {}),
  }))

  useEffect(() => {
    writeJson(SETTINGS_KEY, settings)
  }, [settings])

  const set = useCallback<SettingsValue["set"]>((key, value) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }, [])

  const value = useMemo(
    () => ({ settings, set, reset: () => setSettings(defaults()) }),
    [settings, set]
  )

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext)
  if (!value)
    throw new Error("useSettings must be used inside a SettingsProvider")

  return value
}
