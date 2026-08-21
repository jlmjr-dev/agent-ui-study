import { Check, Copy } from "lucide-react"
import { IconButton, cn } from "@agent-ui-study/ui"
import { memo, useMemo } from "react"

import { useCopy } from "@/shared/hooks/use-copy"

import { highlight, type TokenType } from "./highlight"

const TOKEN_CLASS: Record<TokenType, string> = {
  plain: "",
  comment: "text-text-faint italic",
  string: "text-success",
  number: "text-warning",
  keyword: "text-accent",
  type: "text-accent/85",
  function: "text-text",
  punctuation: "text-text-muted",
}

export type CodeBlockProps = {
  code: string
  language: string | null
  className?: string
}

/**
 * Memoised on the code itself. During a stream the surrounding message
 * re-renders on every delta, and re-tokenising a block that has not changed is
 * the most expensive wasted work in the transcript.
 */
export const CodeBlock = memo(function CodeBlock({
  code,
  language,
  className,
}: CodeBlockProps) {
  const { copied, copy } = useCopy()
  const tokens = useMemo(() => highlight(code, language), [code, language])

  return (
    <div
      className={cn(
        "group/code relative my-3 overflow-hidden rounded-xl border border-border bg-surface-sunken",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-[11px] text-text-faint">
        <span className="font-mono tracking-wide">{language ?? "text"}</span>
        <IconButton
          size="sm"
          label={copied ? "Copied" : "Copy code"}
          onClick={() => void copy(code)}
          className="opacity-0 transition-opacity group-hover/code:opacity-100 focus-visible:opacity-100"
        >
          {copied ? (
            <Check className="size-3.5 text-success" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </IconButton>
      </div>

      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed">
        <code className="font-mono">
          {tokens.map((token, index) => (
            <span key={index} className={TOKEN_CLASS[token.type]}>
              {token.value}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
})
