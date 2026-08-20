import { useEffect } from "react"

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
