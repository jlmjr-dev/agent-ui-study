/**
 * Ids are prefixed so a value read out of persisted state says what it is.
 * The shapes mirror the API's (`msg_`, `toolu_`) because the whole point of
 * this package is that a scripted turn and a real one are indistinguishable
 * to everything above it.
 */
export function createId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 20)
      : Math.random().toString(36).slice(2).padEnd(20, "0").slice(0, 20)

  return `${prefix}_${random}`
}
