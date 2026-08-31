import type { Artifact } from "@agent-ui-study/protocol"

/**
 * Which artifact an open panel should be showing.
 *
 * The panel outlives the conversation under it: switching chats leaves the
 * previous chat's artifact id selected, and a panel opened before a run has
 * no selection at all. Both should land on the newest artifact of the chat on
 * screen rather than on an empty panel. A selection that still exists is left
 * alone, so paging back to an older artifact survives a new one arriving.
 */
export function resolveArtifactId(
  artifacts: Artifact[],
  selected: string | null
): string | null {
  if (artifacts.some((artifact) => artifact.id === selected)) return selected

  return artifacts.at(-1)?.id ?? null
}
