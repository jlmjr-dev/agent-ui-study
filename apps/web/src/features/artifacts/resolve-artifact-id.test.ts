import type { Artifact } from "@agent-ui-study/protocol"
import { describe, expect, it } from "vitest"

import { resolveArtifactId } from "./resolve-artifact-id"

function artifact(id: string): Artifact {
  return {
    id,
    title: id,
    kind: "markdown",
    language: null,
    versions: [{ content: "", createdAt: 0, messageId: "m1" }],
  }
}

describe("resolveArtifactId", () => {
  it("keeps a selection the conversation still holds", () => {
    const artifacts = [artifact("a"), artifact("b")]

    expect(resolveArtifactId(artifacts, "a")).toBe("a")
  })

  it("falls back to the newest artifact when nothing is selected", () => {
    const artifacts = [artifact("a"), artifact("b")]

    expect(resolveArtifactId(artifacts, null)).toBe("b")
  })

  it("drops a selection left behind by another conversation", () => {
    const artifacts = [artifact("a")]

    expect(resolveArtifactId(artifacts, "from-another-chat")).toBe("a")
  })

  it("has nothing to show for a conversation with no artifacts", () => {
    expect(resolveArtifactId([], "a")).toBeNull()
  })
})
