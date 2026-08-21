/**
 * A small syntax highlighter.
 *
 * Shiki and highlight.js are both larger than everything else in this app put
 * together, and a chat interface only ever shows short snippets in a handful
 * of languages. This covers those languages with one pass of a combined
 * regular expression, and it is lossless: concatenating the token values
 * always reproduces the input exactly, so nothing can silently disappear from
 * a code block.
 */

export type TokenType =
  | "plain"
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "type"
  | "function"
  | "punctuation"

export type Token = {
  type: TokenType
  value: string
}

type LanguageSpec = {
  keywords: string[]
  lineComment: string | null
  blockComment: boolean
  types: boolean
}

const JS_KEYWORDS = [
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "declare",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "keyof",
  "let",
  "new",
  "null",
  "of",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "satisfies",
  "set",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "void",
  "while",
  "yield",
]

const PY_KEYWORDS = [
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "False",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "None",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "True",
  "try",
  "while",
  "with",
  "yield",
]

const SH_KEYWORDS = [
  "case",
  "cd",
  "do",
  "done",
  "echo",
  "elif",
  "else",
  "esac",
  "exit",
  "export",
  "fi",
  "for",
  "function",
  "if",
  "in",
  "local",
  "return",
  "set",
  "then",
  "while",
]

const LANGUAGES: Record<string, LanguageSpec> = {
  ts: {
    keywords: JS_KEYWORDS,
    lineComment: "//",
    blockComment: true,
    types: true,
  },
  js: {
    keywords: JS_KEYWORDS,
    lineComment: "//",
    blockComment: true,
    types: true,
  },
  json: {
    keywords: ["true", "false", "null"],
    lineComment: null,
    blockComment: false,
    types: false,
  },
  css: { keywords: [], lineComment: null, blockComment: true, types: false },
  python: {
    keywords: PY_KEYWORDS,
    lineComment: "#",
    blockComment: false,
    types: true,
  },
  bash: {
    keywords: SH_KEYWORDS,
    lineComment: "#",
    blockComment: false,
    types: false,
  },
  diff: { keywords: [], lineComment: null, blockComment: false, types: false },
}

const ALIASES: Record<string, string> = {
  typescript: "ts",
  tsx: "ts",
  javascript: "js",
  jsx: "js",
  mjs: "js",
  py: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  html: "css",
  scss: "css",
  yaml: "json",
  yml: "json",
}

export function resolveLanguage(language: string | null): string | null {
  if (!language) return null

  const normalized = language.toLowerCase()
  const resolved = ALIASES[normalized] ?? normalized

  return resolved in LANGUAGES ? resolved : null
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function buildPattern(spec: LanguageSpec): RegExp {
  const parts: string[] = []

  if (spec.blockComment) parts.push("/\\*[\\s\\S]*?(?:\\*/|$)")
  if (spec.lineComment) parts.push(`${escape(spec.lineComment)}[^\\n]*`)

  // Unterminated strings have to match to end-of-line, or a half-typed line
  // arriving mid-stream would fall through and highlight as code.
  parts.push('"(?:[^"\\\\\\n]|\\\\.)*(?:"|$)')
  parts.push("'(?:[^'\\\\\\n]|\\\\.)*(?:'|$)")
  parts.push("`(?:[^`\\\\]|\\\\.)*(?:`|$)")

  if (spec.keywords.length > 0) {
    parts.push(`\\b(?:${spec.keywords.map(escape).join("|")})\\b`)
  }

  parts.push("\\b\\d[\\d_]*(?:\\.\\d+)?(?:e[+-]?\\d+)?\\b")

  if (spec.types) parts.push("\\b[A-Z][A-Za-z0-9_]*\\b")

  parts.push("\\b[A-Za-z_$][\\w$]*(?=\\s*\\()")
  parts.push("[{}()[\\].,;:]")

  return new RegExp(parts.map((part) => `(${part})`).join("|"), "gy")
}

function classify(
  spec: LanguageSpec,
  groups: (string | undefined)[]
): TokenType {
  let cursor = 0

  const order: TokenType[] = []
  if (spec.blockComment) order.push("comment")
  if (spec.lineComment) order.push("comment")
  order.push("string", "string", "string")
  if (spec.keywords.length > 0) order.push("keyword")
  order.push("number")
  if (spec.types) order.push("type")
  order.push("function", "punctuation")

  for (const type of order) {
    if (groups[cursor] !== undefined) return type
    cursor += 1
  }

  return "plain"
}

export function highlight(code: string, language: string | null): Token[] {
  const resolved = resolveLanguage(language)
  if (!resolved) return [{ type: "plain", value: code }]

  const spec = LANGUAGES[resolved]
  const pattern = buildPattern(spec)
  const tokens: Token[] = []

  let index = 0
  let plainFrom = 0

  while (index < code.length) {
    pattern.lastIndex = index
    const match = pattern.exec(code)

    if (!match) {
      index += 1
      continue
    }

    if (plainFrom < index) {
      tokens.push({ type: "plain", value: code.slice(plainFrom, index) })
    }

    tokens.push({ type: classify(spec, match.slice(1)), value: match[0] })
    index += match[0].length
    plainFrom = index
  }

  if (plainFrom < code.length) {
    tokens.push({ type: "plain", value: code.slice(plainFrom) })
  }

  return tokens
}
