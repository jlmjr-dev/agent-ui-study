const MAX_LENGTH = 52

/**
 * Conversations title themselves from the first thing the user said, which is
 * what all three products do before a model-written title replaces it.
 */
export function titleFromPrompt(prompt: string): string {
  const firstLine = prompt.trim().split("\n")[0]?.trim() ?? ""

  if (!firstLine) return "New chat"
  if (firstLine.length <= MAX_LENGTH) return firstLine

  // Cut on a word boundary when there is one close to the limit, so a title
  // does not end mid-word for the sake of four extra characters.
  const clipped = firstLine.slice(0, MAX_LENGTH)
  const lastSpace = clipped.lastIndexOf(" ")

  return `${(lastSpace > MAX_LENGTH - 14 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`
}
