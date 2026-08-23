import type { Artifact } from "@agent-ui-study/protocol"

import { CodeBlock } from "@/features/markdown/code-block"
import { Markdown } from "@/features/markdown/markdown"

export function ArtifactPreview({
  artifact,
  content,
  mode,
}: {
  artifact: Artifact
  content: string
  mode: "preview" | "source"
}) {
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
        srcDoc={content}
        className="h-full w-full border-0 bg-white"
      />
    )
  }

  return (
    <div className="px-5 py-4">
      <Markdown text={content} />
    </div>
  )
}
