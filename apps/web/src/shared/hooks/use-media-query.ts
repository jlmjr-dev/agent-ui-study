import { useEffect, useState } from "react"

/**
 * The width at which the side surfaces stop being overlays and become
 * columns, matching Tailwind's `md`. Layout says it in CSS; the few places
 * that also have to say it in JavaScript say it from here.
 */
export const DESKTOP_QUERY = "(min-width: 768px)"

/**
 * A media query React re-renders on. Reading `matchMedia` during render
 * answers for whatever size the window was at first paint and is never
 * corrected, so a phone-shaped overlay survives being dragged out to a
 * desktop width and keeps claiming to be a modal dialog.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    const apply = () => setMatches(media.matches)

    // The window can change between the first render and this effect.
    apply()
    media.addEventListener("change", apply)

    return () => media.removeEventListener("change", apply)
  }, [query])

  return matches
}
