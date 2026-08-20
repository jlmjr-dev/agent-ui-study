import { Monitor, Moon, Sun } from "lucide-react"
import { Tabs } from "@agent-ui-study/ui"

import {
  useSettings,
  type ThemePreference,
} from "@/features/settings/settings-context"

const ICONS: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

export function ThemeToggle() {
  const { settings, set } = useSettings()

  return (
    <Tabs
      label="Theme"
      value={settings.theme}
      onChange={(theme) => set("theme", theme)}
      options={(["light", "dark", "system"] as const).map((value) => {
        const Icon = ICONS[value]

        return {
          value,
          label: value[0].toUpperCase() + value.slice(1),
          icon: <Icon className="size-3.5" />,
        }
      })}
    />
  )
}
