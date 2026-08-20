import { describe, expect, it } from "vitest"

import { bucketOf, formatBytes, formatRelative, formatTokens } from "./format"
import { titleFromPrompt } from "./titles"

const NOON = new Date("2026-08-20T12:00:00").getTime()
const HOUR = 3_600_000

describe("bucketOf", () => {
  it("buckets by calendar day, not by elapsed hours", () => {
    // 11pm the previous evening is Yesterday, even though it is 13 hours ago.
    expect(bucketOf(NOON - 13 * HOUR, NOON)).toBe("Yesterday")
  })

  it("keeps this morning under Today", () => {
    expect(bucketOf(NOON - 4 * HOUR, NOON)).toBe("Today")
  })

  it("groups the rest of the week together", () => {
    expect(bucketOf(NOON - 4 * 24 * HOUR, NOON)).toBe("Previous 7 days")
  })

  it("falls back to a month once it is old", () => {
    expect(bucketOf(NOON - 60 * 24 * HOUR, NOON)).toBe("June 2026")
  })
})

describe("formatRelative", () => {
  it("names today and yesterday", () => {
    expect(formatRelative(NOON, NOON)).toBe("Today")
    expect(formatRelative(NOON - 20 * HOUR, NOON)).toBe("Yesterday")
  })
})

describe("titleFromPrompt", () => {
  it("uses the first line", () => {
    expect(titleFromPrompt("Fix the cart\n\nmore detail")).toBe("Fix the cart")
  })

  it("falls back when the prompt is blank", () => {
    expect(titleFromPrompt("   ")).toBe("New chat")
  })

  it("cuts on a word boundary rather than mid-word", () => {
    const prompt =
      "Something is wrong with the cart total whenever a discount applies"
    const title = titleFromPrompt(prompt)
    const kept = title.slice(0, -1)

    expect(title.endsWith("…")).toBe(true)
    expect(prompt.startsWith(kept)).toBe(true)
    // The character the cut landed on is a space, so no word is split.
    expect(prompt[kept.length]).toBe(" ")
    expect(title.length).toBeLessThanOrEqual(53)
  })

  it("cuts mid-word rather than losing most of the title", () => {
    const title = titleFromPrompt(`refactor ${"x".repeat(60)}`)

    expect(title.length).toBe(53)
  })
})

describe("formatting numbers", () => {
  it("keeps small byte counts exact", () => {
    expect(formatBytes(900)).toBe("900 B")
    expect(formatBytes(2048)).toBe("2 KB")
  })

  it("abbreviates token counts", () => {
    expect(formatTokens(840)).toBe("840")
    expect(formatTokens(1240)).toBe("1.2k")
    expect(formatTokens(24_000)).toBe("24k")
  })
})
