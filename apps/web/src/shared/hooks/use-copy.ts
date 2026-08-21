import { useCallback, useEffect, useRef, useState } from "react"

/** Copies text and flips a flag for a moment so a button can confirm it. */
export function useCopy(resetMs = 1600) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        // Clipboard access can be denied. Nothing useful to do about it, and
        // an unhandled rejection here would surface as a crash overlay.
        return
      }

      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), resetMs)
    },
    [resetMs]
  )

  return { copied, copy }
}
