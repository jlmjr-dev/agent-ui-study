import { useEffect, useState } from "react"

import { useSettings } from "@/features/settings/settings-context"

/**
 * Applies the theme to the document element. "system" leaves no attribute
 * behind and follows the OS, so a user who never touches the toggle gets
 * whatever their machine is set to, including when they change it mid-session.
 */
export function useApplyTheme(): void {
  const { settings } = useSettings()

  useEffect(() => {
    const root = document.documentElement

    if (settings.theme !== "system") {
      root.dataset.theme = settings.theme
      return
    }

    const query = window.matchMedia("(prefers-color-scheme: dark)")

    function apply() {
      root.dataset.theme = query.matches ? "dark" : "light"
    }

    apply()
    query.addEventListener("change", apply)

    return () => query.removeEventListener("change", apply)
  }, [settings.theme])
}

/**
 * The theme actually in force, with "system" already resolved. Anything that
 * has to hand a concrete light or dark to something outside the document, such
 * as an iframe, needs this rather than the raw preference.
 */
export function useResolvedTheme(): "light" | "dark" {
  const { settings } = useSettings()
  const [systemIsDark, setSystemIsDark] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
  )

  useEffect(() => {
    if (settings.theme !== "system") return

    const query = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => setSystemIsDark(query.matches)

    apply()
    query.addEventListener("change", apply)

    return () => query.removeEventListener("change", apply)
  }, [settings.theme])

  if (settings.theme !== "system") return settings.theme

  return systemIsDark ? "dark" : "light"
}
