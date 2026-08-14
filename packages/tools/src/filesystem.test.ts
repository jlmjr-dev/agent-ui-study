import { beforeEach, describe, expect, it } from "vitest"

import { createFileSystem, globToRegExp } from "./filesystem"

describe("globToRegExp", () => {
  it("keeps a single star inside one segment", () => {
    const matcher = globToRegExp("src/*.ts")

    expect(matcher.test("src/main.ts")).toBe(true)
    expect(matcher.test("src/nested/main.ts")).toBe(false)
  })

  it("lets a double star cross directories, including none", () => {
    const matcher = globToRegExp("**/*.ts")

    expect(matcher.test("main.ts")).toBe(true)
    expect(matcher.test("src/a/b/main.ts")).toBe(true)
    expect(matcher.test("src/main.css")).toBe(false)
  })

  it("treats a dot as a literal", () => {
    expect(globToRegExp("a.ts").test("axts")).toBe(false)
  })
})

describe("the virtual filesystem", () => {
  let fs: ReturnType<typeof createFileSystem>

  beforeEach(() => {
    fs = createFileSystem({
      "readme.md": "# Title\nSome prose",
      "src/main.ts": "export const answer = 42\n",
      "src/lib/format.ts": "export function format() {}\n",
      "src/lib/parse.ts": "export function parse() {}\n",
    })
  })

  it("lists a directory with folders first", () => {
    expect(fs.list("src")).toEqual([
      { name: "lib", path: "src/lib", isDirectory: true },
      { name: "main.ts", path: "src/main.ts", isDirectory: false },
    ])
  })

  it("lists the root when given an empty path", () => {
    expect(fs.list("").map((entry) => entry.name)).toEqual(["src", "readme.md"])
  })

  it("globs across nested directories", () => {
    expect(fs.glob("src/**/*.ts")).toEqual([
      "src/lib/format.ts",
      "src/lib/parse.ts",
      "src/main.ts",
    ])
  })

  it("greps case-insensitively and reports one-based lines", () => {
    expect(fs.grep("title")).toEqual([
      { path: "readme.md", line: 1, text: "# Title" },
    ])
  })

  it("narrows a grep with a glob", () => {
    expect(fs.grep("export", "src/lib/*.ts")).toHaveLength(2)
  })

  it("normalizes a leading ./ so both spellings hit the same file", () => {
    fs.write("./src/main.ts", "changed")

    expect(fs.read("src/main.ts")).toBe("changed")
    expect(fs.paths()).toHaveLength(4)
  })
})
