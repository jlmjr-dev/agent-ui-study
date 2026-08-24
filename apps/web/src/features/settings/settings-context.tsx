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

const SETTINGS_KEY = "aus:settings"

export type ThemePreference = "light" | "dark" | "system"

export type Settings = {
  theme: ThemePreference
  /**
   * Kept in localStorage because there is nowhere else to put it in a
   * frontend-only build. The settings screen says so in as many words.
   */
  apiKey: string
  useLiveProvider: boolean
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
    apiKey: "",
    useLiveProvider: false,
    showThinking: true,
    instantStream: false,
    sidebarOpen:
      typeof window === "undefined" ||
      window.matchMedia("(min-width: 768px)").matches,
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
