import { useEffect } from "react"

export type Hotkey = {
  /** Lower-case key name, as reported by KeyboardEvent.key. */
  key: string
  meta?: boolean
  shift?: boolean
  run: () => void
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  )
}

/**
 * Shortcuts that do not fire while the user is typing, unless they are
 * modified. Binding a bare letter globally is what makes a chat app eat the
 * first character of a message.
 */
export function useHotkeys(hotkeys: Hotkey[]): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const modified = event.metaKey || event.ctrlKey

      for (const hotkey of hotkeys) {
        if (event.key.toLowerCase() !== hotkey.key) continue
        if (Boolean(hotkey.meta) !== modified) continue
        if (Boolean(hotkey.shift) !== event.shiftKey) continue
        if (!hotkey.meta && isTypingTarget(event.target)) continue

        event.preventDefault()
        hotkey.run()
        return
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [hotkeys])
}
