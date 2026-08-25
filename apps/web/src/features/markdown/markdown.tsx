import { memo, type ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { CodeBlock } from "./code-block"

function languageOf(className: unknown): string | null {
  if (typeof className !== "string") return null

  return /language-([\w-]+)/.exec(className)?.[1] ?? null
}

/**
 * Long-form answers are the product here, so the prose styles are deliberate:
 * a measured line length, real spacing between blocks, and tables and lists
 * that survive being pasted out of a model's output.
 */
export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    /* 16px in a 736px column lands under 90 characters. At 15px the same
       column runs past 100, which is where long-form prose stops being easy
       to track from one line to the next. */
    <div className="text-[16px] leading-[1.7] text-text [&>:first-child]:mt-0 [&>:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // A paragraph gap has to beat the line gap inside one, or the
          // boundaries read as line breaks and the answer becomes a slab.
          p: ({ children }) => <p className="my-4">{children}</p>,

          h1: ({ children }) => (
            <h1 className="mt-6 mb-3 text-xl font-semibold">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 mb-2.5 text-lg font-semibold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-5 mb-2 text-[16px] font-semibold">{children}</h3>
          ),

          ul: ({ children }) => (
            <ul className="my-4 list-disc space-y-1.5 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 list-decimal space-y-1.5 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,

          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-border-strong pl-4 text-text-muted">
              {children}
            </blockquote>
          ),

          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent underline decoration-1 underline-offset-2 hover:no-underline"
            >
              {children}
            </a>
          ),

          hr: () => <hr className="my-5 border-border" />,

          table: ({ children }) => (
            // Wide tables scroll inside themselves; the column must not.
            <div className="my-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-[13px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-surface-raised text-text-muted">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-medium whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-t border-border px-3 py-2 align-top">
              {children}
            </td>
          ),

          code: ({ className, children }) => {
            const language = languageOf(className)
            const text = String(children)

            // react-markdown gives inline code no language class and no
            // newlines; a fenced block gets at least one of the two.
            if (!language && !text.includes("\n")) {
              return (
                <code className="rounded-[5px] bg-surface-raised px-1.5 py-0.5 font-mono text-[0.87em] text-text">
                  {children}
                </code>
              )
            }

            return (
              <CodeBlock code={text.replace(/\n$/, "")} language={language} />
            )
          },

          pre: ({ children }: { children?: ReactNode }) => <>{children}</>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
})
