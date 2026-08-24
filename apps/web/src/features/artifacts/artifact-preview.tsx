import type { Artifact } from "@agent-ui-study/protocol"

import { CodeBlock } from "@/features/markdown/code-block"
import { Markdown } from "@/features/markdown/markdown"
import { useResolvedTheme } from "@/features/theme/use-theme"

import { withColorScheme } from "./color-scheme"

export function ArtifactPreview({
  artifact,
  content,
  mode,
}: {
  artifact: Artifact
  content: string
  mode: "preview" | "source"
}) {
  const theme = useResolvedTheme()

  if (mode === "source" || artifact.kind === "code") {
    return (
      <div className="p-4">
        <CodeBlock
          code={content}
          language={
            artifact.language ??
            (artifact.kind === "html" ? "html" : "markdown")
          }
          className="my-0"
        />
      </div>
    )
  }

  if (artifact.kind === "html") {
    return (
      /**
       * Sandboxed with no `allow-same-origin`, so the frame gets an opaque
       * origin: the script inside can run, and it cannot reach this page's
       * DOM, storage or cookies. Dropping that one token is what separates a
       * live preview from handing a generated document the whole session.
       */
      <iframe
        title={artifact.title}
        sandbox="allow-scripts"
        srcDoc={withColorScheme(content, theme)}
        // The frame takes the panel's own surface rather than forcing white,
        // so an artifact that declares `color-scheme: light dark` follows the
        // theme instead of punching a lit slab into a dark page.
        className="h-full w-full border-0 bg-surface"
      />
    )
  }

  return (
    <div className="px-5 py-4">
      <Markdown text={content} />
    </div>
  )
}
