/**
 * Three tiers, because all three products being studied present the same
 * choice: something fast, something balanced, and something that reasons
 * before it answers. The names here are this project's own; `apiModel` is
 * what the live provider actually sends, and the settings screen shows it.
 */
export type ModelId = "swift" | "balanced" | "deep"

export type ModelInfo = {
  id: ModelId
  name: string
  blurb: string
  /** Whether a turn on this model emits thinking blocks. */
  reasons: boolean
  /** The real model the live provider maps this tier onto. */
  apiModel: string
  contextWindow: number
}

export const MODELS: readonly ModelInfo[] = [
  {
    id: "swift",
    name: "Swift",
    blurb: "Fastest replies, for everyday questions",
    reasons: false,
    apiModel: "claude-haiku-4-5",
    contextWindow: 200_000,
  },
  {
    id: "balanced",
    name: "Balanced",
    blurb: "The everyday default, capable and quick",
    reasons: false,
    apiModel: "claude-sonnet-5",
    contextWindow: 1_000_000,
  },
  {
    id: "deep",
    name: "Deep",
    blurb: "Thinks the problem through before answering",
    reasons: true,
    apiModel: "claude-opus-5",
    contextWindow: 1_000_000,
  },
]

export const DEFAULT_MODEL: ModelId = "balanced"

export function modelInfo(id: ModelId): ModelInfo {
  return MODELS.find((model) => model.id === id) ?? MODELS[1]
}
