/**
 * Flattens a list of file paths into an indented, sorted, directory-first
 * list: the shape a file tree renders from.
 */
export type TreeEntry = {
  path: string
  name: string
  depth: number
  isDirectory: boolean
}

/** Flattens a list of paths into an indented, sorted, directory-first list. */
export function buildTree(paths: string[]): TreeEntry[] {
  const entries = new Map<string, TreeEntry>()

  for (const path of paths) {
    const segments = path.split("/")

    segments.forEach((name, depth) => {
      const partial = segments.slice(0, depth + 1).join("/")

      entries.set(partial, {
        path: partial,
        name,
        depth,
        isDirectory: depth < segments.length - 1,
      })
    })
  }

  /**
   * Sorting on a key rather than comparing paths directly. A directory's own
   * row has a single segment, so depth alone cannot tell it apart from a file
   * at the root: the flag has to come from the entry.
   */
  return [...entries.values()].sort((a, b) =>
    sortKey(a).localeCompare(sortKey(b))
  )
}

function sortKey(entry: TreeEntry): string {
  const segments = entry.path.split("/")

  return segments
    .map((segment, index) => {
      const isDirectory = index < segments.length - 1 || entry.isDirectory

      return `${isDirectory ? "0" : "1"}${segment}`
    })
    .join("\u0000")
}
