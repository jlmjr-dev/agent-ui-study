import type { VirtualFileSystem } from "./filesystem"

export type CommandResult = {
  stdout: string
  exitCode: number
}

/**
 * A stand-in shell. It answers the handful of commands an agent actually
 * reaches for in this workspace and refuses everything else, which is closer
 * to a real sandboxed tool than a shell that pretends to run anything.
 */
export function runCommand(
  fs: VirtualFileSystem,
  command: string
): CommandResult {
  const trimmed = command.trim()

  if (/^(pnpm|npm|yarn) (run )?test/.test(trimmed)) {
    const specs = fs.glob("**/*.test.ts")
    const cases = specs.reduce(
      (count, path) => count + (fs.read(path)?.match(/\bit\(/g)?.length ?? 0),
      0
    )

    return {
      stdout: [
        " RUN  vitest",
        "",
        ...specs.map((path) => ` ✓ ${path}`),
        "",
        ` Test Files  ${specs.length} passed (${specs.length})`,
        `      Tests  ${cases} passed (${cases})`,
      ].join("\n"),
      exitCode: 0,
    }
  }

  if (/^(pnpm|npm|yarn) (run )?build/.test(trimmed) || trimmed === "tsc -b") {
    return { stdout: "tsc -b\n\nBuilt in 1.2s", exitCode: 0 }
  }

  if (trimmed === "git status" || trimmed === "git status -s") {
    return {
      stdout: "On branch main\nnothing to commit, working tree clean",
      exitCode: 0,
    }
  }

  if (trimmed.startsWith("ls")) {
    const path = trimmed
      .slice(2)
      .trim()
      .replace(/^-\w+\s*/, "")
    const entries = fs.list(path)

    return {
      stdout: entries
        .map((entry) => (entry.isDirectory ? `${entry.name}/` : entry.name))
        .join("\n"),
      exitCode: 0,
    }
  }

  if (trimmed.startsWith("cat ")) {
    const path = trimmed.slice(4).trim()
    const content = fs.read(path)

    return content === null
      ? { stdout: `cat: ${path}: No such file or directory`, exitCode: 1 }
      : { stdout: content, exitCode: 0 }
  }

  if (trimmed.startsWith("wc -l ")) {
    const path = trimmed.slice(6).trim()
    const content = fs.read(path)

    return content === null
      ? { stdout: `wc: ${path}: No such file or directory`, exitCode: 1 }
      : { stdout: `${content.split("\n").length} ${path}`, exitCode: 0 }
  }

  return {
    stdout: `${trimmed.split(" ")[0]}: not permitted in this workspace`,
    exitCode: 127,
  }
}
