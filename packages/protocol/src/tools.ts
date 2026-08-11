/**
 * Tool definitions carry a JSON Schema exactly as the API expects one, so the
 * same array can be handed to the scripted registry or sent over the wire.
 */

export type JsonSchema = {
  type: "object"
  properties: Record<string, JsonSchemaProperty>
  required?: string[]
  additionalProperties?: boolean
}

export type JsonSchemaProperty = {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object"
  description?: string
  enum?: string[]
  items?: JsonSchemaProperty
  default?: unknown
}

export type ToolDefinition = {
  name: string
  description: string
  input_schema: JsonSchema
}

export type ToolOutcome = {
  content: string
  isError: boolean
  /** Anything the UI wants to draw beyond the raw text. */
  detail?: ToolDetail
}

/**
 * Tool cards read better when they can show structure rather than a wall of
 * text, so a tool may return a hint about what it did alongside its output.
 */
export type ToolDetail =
  | { kind: "diff"; path: string; added: number; removed: number }
  | { kind: "listing"; path: string; entries: string[] }
  | { kind: "matches"; query: string; count: number }
  | { kind: "command"; command: string; exitCode: number }
  | { kind: "artifact"; artifactId: string; title: string }
  | { kind: "todos"; items: { text: string; done: boolean }[] }
