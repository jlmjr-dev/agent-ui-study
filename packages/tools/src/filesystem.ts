/**
 * An in-memory filesystem. The tools need something real to act on, and a flat
 * path-to-content map is enough: directories are implied by the paths, which
 * keeps writes trivial and makes the whole workspace one serialisable object.
 */

export type GrepMatch = {
  path: string
  line: number
  text: string
}

export type DirEntry = {
  name: string
  path: string
  isDirectory: boolean
}

export type VirtualFileSystem = ReturnType<typeof createFileSystem>

export function normalize(path: string): string {
  return path.replace(/^\.\//, "").replace(/^\/+/, "").replace(/\/+$/, "")
}

/**
 * `**` crosses separators, `*` does not, and `?` is a single character. Every
 * other character is escaped, so a dot in a pattern means a literal dot.
 */
export function globToRegExp(pattern: string): RegExp {
  let source = ""

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index]

    if (char === "*") {
      if (pattern[index + 1] === "*") {
        // `**/` should also match zero directories, so `**/*.ts` finds
        // `main.ts` at the root and not just files inside a folder.
        const slash = pattern[index + 2] === "/"
        source += slash ? "(?:.*/)?" : ".*"
        index += slash ? 2 : 1
      } else {
        source += "[^/]*"
      }
    } else if (char === "?") {
      source += "[^/]"
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&")
    }
  }

  return new RegExp(`^${source}$`)
}

export function createFileSystem(seed: Record<string, string> = {}) {
  const files = new Map<string, string>()

  for (const [path, content] of Object.entries(seed)) {
    files.set(normalize(path), content)
  }

  function paths(): string[] {
    return [...files.keys()].sort()
  }

  return {
    paths,

    exists(path: string): boolean {
      return files.has(normalize(path))
    },

    read(path: string): string | null {
      return files.get(normalize(path)) ?? null
    },

    write(path: string, content: string): void {
      files.set(normalize(path), content)
    },

    remove(path: string): boolean {
      return files.delete(normalize(path))
    },

    /** Immediate children of a directory, folders first. */
    list(path: string): DirEntry[] {
      const dir = normalize(path)
      const prefix = dir === "" ? "" : `${dir}/`
      const seen = new Map<string, DirEntry>()

      for (const file of files.keys()) {
        if (!file.startsWith(prefix)) continue

        const rest = file.slice(prefix.length)
        if (rest === "") continue

        const slash = rest.indexOf("/")
        const name = slash === -1 ? rest : rest.slice(0, slash)

        seen.set(name, {
          name,
          path: `${prefix}${name}`,
          isDirectory: slash !== -1,
        })
      }

      return [...seen.values()].sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    },

    glob(pattern: string): string[] {
      const matcher = globToRegExp(normalize(pattern))

      return paths().filter((path) => matcher.test(path))
    },

    grep(query: string, pattern?: string): GrepMatch[] {
      const candidates = pattern ? this.glob(pattern) : paths()
      const needle = query.toLowerCase()
      const matches: GrepMatch[] = []

      for (const path of candidates) {
        const lines = (files.get(path) ?? "").split("\n")

        lines.forEach((text, index) => {
          if (text.toLowerCase().includes(needle)) {
            matches.push({ path, line: index + 1, text: text.trim() })
          }
        })
      }

      return matches
    },

    snapshot(): Record<string, string> {
      return Object.fromEntries(files)
    },
  }
}
