import { describe, expect, it } from "vitest"

import { highlight, resolveLanguage } from "./highlight"

function rejoin(code: string, language: string) {
  return highlight(code, language)
    .map((token) => token.value)
    .join("")
}

function typesOf(code: string, language: string) {
  return highlight(code, language)
    .filter((token) => token.value.trim() !== "")
    .map((token) => `${token.type}:${token.value}`)
}

describe("resolveLanguage", () => {
  it("maps the aliases people actually type", () => {
    expect(resolveLanguage("typescript")).toBe("ts")
    expect(resolveLanguage("TSX")).toBe("ts")
    expect(resolveLanguage("sh")).toBe("bash")
  })

  it("returns nothing for a language it cannot highlight", () => {
    expect(resolveLanguage("brainfuck")).toBeNull()
    expect(resolveLanguage(null)).toBeNull()
  })
})

describe("highlight", () => {
  it("is lossless", () => {
    const code = `const x = "a\\"b" // trailing\nfunction f() { return 1.5 }\n`

    expect(rejoin(code, "ts")).toBe(code)
  })

  it("is lossless on text it cannot highlight", () => {
    const code = "!!! not a language !!!"

    expect(rejoin(code, "brainfuck")).toBe(code)
  })

  it("finds keywords, strings and numbers", () => {
    const tokens = typesOf(`const n = 42`, "ts")

    expect(tokens).toContain("keyword:const")
    expect(tokens).toContain("number:42")
  })

  it("does not highlight inside a comment", () => {
    const tokens = highlight(`// const "x" = 1\n`, "ts")

    expect(tokens[0]).toEqual({ type: "comment", value: `// const "x" = 1` })
  })

  it("does not highlight a keyword inside a string", () => {
    const tokens = typesOf(`const s = "return true"`, "ts")

    expect(tokens).toContain(`string:"return true"`)
    expect(tokens).not.toContain("keyword:return")
  })

  it("closes an unterminated string at the end of the line", () => {
    // Mid-stream a code block routinely arrives half-written.
    const tokens = highlight(`const s = "half`, "ts")

    expect(tokens.at(-1)).toEqual({ type: "string", value: `"half` })
  })

  it("keeps a comment marker from another language plain", () => {
    const tokens = typesOf(`# not a comment in ts`, "ts")

    expect(tokens.every((token) => !token.startsWith("comment:"))).toBe(true)
  })

  it("highlights a shell comment", () => {
    expect(highlight("# install\npnpm i", "bash")[0].type).toBe("comment")
  })

  it("marks a call site as a function", () => {
    expect(typesOf(`format(value)`, "ts")).toContain("function:format")
  })
})
