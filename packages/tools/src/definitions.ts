import type { ToolDefinition } from "@agent-ui-study/protocol"

/**
 * Written the way a real tool surface is: a description that says when to
 * reach for the tool, and a schema tight enough that a wrong call is a
 * validation error rather than a confusing result.
 */
export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    name: "list_files",
    description:
      "List the entries directly inside a directory of the workspace. Use it to orient before reading anything.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Directory to list. Omit or pass an empty string for the root.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "read_file",
    description:
      "Read a file from the workspace. Prefer reading a whole small file over guessing at a range.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path relative to the workspace root.",
        },
        offset: {
          type: "integer",
          description: "First line to return, one-based.",
        },
        limit: { type: "integer", description: "How many lines to return." },
      },
      required: ["path"],
      additionalProperties: false,
    },
  },
  {
    name: "write_file",
    description:
      "Create a file or replace its contents entirely. Read the file first unless you are creating it.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path relative to the workspace root.",
        },
        content: { type: "string", description: "The complete new contents." },
      },
      required: ["path", "content"],
      additionalProperties: false,
    },
  },
  {
    name: "search_files",
    description:
      "Search file contents for a string. Narrow with a glob when you know the shape of the paths.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Text to look for, case-insensitive.",
        },
        glob: {
          type: "string",
          description: "Optional path filter, for example src/**/*.ts",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "run_command",
    description:
      "Run a command in the workspace. Only the project's own scripts and a few read-only shell commands are available.",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "The command line to run." },
      },
      required: ["command"],
      additionalProperties: false,
    },
  },
  {
    name: "web_search",
    description:
      "Search the web for current information. Use it when the answer depends on something outside the workspace.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "create_artifact",
    description:
      "Open a document or a piece of code in the side panel, where the user can read and keep it. Use it for anything substantial enough to outlive the message.",
    input_schema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Stable id. Reuse it to replace an existing artifact.",
        },
        title: {
          type: "string",
          description: "Short title shown on the panel.",
        },
        kind: {
          type: "string",
          description: "How to present it.",
          enum: ["markdown", "code", "html"],
        },
        language: {
          type: "string",
          description: "Language for a code artifact.",
        },
        content: { type: "string", description: "The full contents." },
      },
      required: ["id", "title", "kind", "content"],
      additionalProperties: false,
    },
  },
  {
    name: "set_todos",
    description:
      "Record the plan for a multi-step task so the user can watch it progress. Send the whole list every time.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "The full list, in order.",
          items: { type: "object" },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
]

export function findDefinition(name: string): ToolDefinition | undefined {
  return TOOL_DEFINITIONS.find((tool) => tool.name === name)
}
