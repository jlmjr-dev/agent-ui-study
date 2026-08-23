import { describe, expect, it } from "vitest"

import { buildTree } from "./build-tree"

describe("buildTree", () => {
  it("creates an entry for each directory along a path", () => {
    expect(buildTree(["src/lib/format.ts"]).map((entry) => entry.path)).toEqual(
      ["src", "src/lib", "src/lib/format.ts"]
    )
  })

  it("puts folders before files at the same level", () => {
    const tree = buildTree(["README.md", "src/main.ts"])

    expect(tree.map((entry) => entry.path)).toEqual([
      "src",
      "src/main.ts",
      "README.md",
    ])
  })

  it("indents by depth", () => {
    const tree = buildTree(["src/lib/format.ts"])

    expect(tree.map((entry) => entry.depth)).toEqual([0, 1, 2])
  })

  it("does not duplicate a shared parent", () => {
    const tree = buildTree(["src/a.ts", "src/b.ts"])

    expect(tree.filter((entry) => entry.path === "src")).toHaveLength(1)
  })
})
