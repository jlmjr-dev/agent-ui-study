import { describe, expect, it } from "vitest"

import { withColorScheme } from "./color-scheme"

describe("withColorScheme", () => {
  it("declares the scheme the app is actually in", () => {
    expect(withColorScheme("<p>hi</p>", "dark")).toContain("color-scheme:dark")
  })

  it("keeps the artifact's own markup intact", () => {
    expect(withColorScheme("<p>hi</p>", "light")).toContain("<p>hi</p>")
  })

  it("wins over a scheme the artifact declares for itself", () => {
    // The artifact's stylesheet comes later, so without !important its own
    // `light dark` would resolve against the OS and ignore the panel.
    const html = withColorScheme(
      "<style>:root{color-scheme:light dark}</style>",
      "dark"
    )

    expect(html).toContain("color-scheme:dark !important")
  })
})
