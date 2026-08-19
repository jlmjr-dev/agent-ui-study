/**
 * localStorage with the sharp edges covered: it throws in private browsing on
 * some engines, and anything already stored may have been written by an older
 * version of the app, so a bad read falls back rather than white-screening.
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback

    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota or a private window. Losing persistence is survivable; throwing
    // in the middle of a render is not.
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Same as above.
  }
}
