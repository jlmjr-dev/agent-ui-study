import { useCallback, useEffect, useRef, useState } from "react"

const BOTTOM_THRESHOLD = 64

/**
 * Follows a growing transcript, and stops following the moment the user
 * scrolls up.
 *
 * Yanking someone back to the bottom while they are reading an earlier part of
 * a long answer is the single most irritating thing a streaming interface can
 * do, so "am I pinned to the bottom" is tracked from the user's own scrolling
 * rather than assumed.
 */
export function useAutoScroll(dependency: unknown) {
  const ref = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState(true)

  const onScroll = useCallback(() => {
    const element = ref.current
    if (!element) return

    const distance =
      element.scrollHeight - element.scrollTop - element.clientHeight

    setPinned(distance < BOTTOM_THRESHOLD)
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const element = ref.current
    if (!element) return

    element.scrollTo({ top: element.scrollHeight, behavior })
    setPinned(true)
  }, [])

  useEffect(() => {
    if (!pinned) return

    const element = ref.current
    if (!element) return

    element.scrollTop = element.scrollHeight
  }, [dependency, pinned])

  return { ref, pinned, onScroll, scrollToBottom }
}
