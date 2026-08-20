const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
const DAY = 86_400_000

export function formatRelative(timestamp: number, now = Date.now()): string {
  const days = Math.round((startOfDay(timestamp) - startOfDay(now)) / DAY)

  if (days === 0) return "Today"
  if (days === -1) return "Yesterday"
  if (days > -7) return RELATIVE.format(days, "day")

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      new Date(timestamp).getFullYear() === new Date(now).getFullYear()
        ? undefined
        : "numeric",
  })
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)

  return date.getTime()
}

/**
 * Sidebar buckets. The boundaries are the ones every one of these products
 * settled on, and they are calendar-based rather than rolling: something from
 * 11pm yesterday belongs under Yesterday, not under "23 hours ago".
 */
export function bucketOf(timestamp: number, now = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(timestamp)) / DAY)

  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days <= 7) return "Previous 7 days"
  if (days <= 30) return "Previous 30 days"

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatTokens(count: number): string {
  if (count < 1000) return `${count}`

  return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}k`
}
