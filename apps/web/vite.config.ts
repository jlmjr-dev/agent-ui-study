import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const root = path.resolve(import.meta.dirname, "../..")

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@agent-ui-study/protocol": path.resolve(root, "packages/protocol/src"),
      "@agent-ui-study/tools": path.resolve(root, "packages/tools/src"),
      "@agent-ui-study/engine": path.resolve(root, "packages/engine/src"),
      "@agent-ui-study/ui": path.resolve(root, "packages/ui/src"),
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // The live provider is imported on demand, so the SDK never reaches
        // the entry chunk. Markdown is the other heavy import, and it pulls a
        // long tail of remark and micromark modules along with it.
        manualChunks(id) {
          if (
            /node_modules\/(react-markdown|remark|rehype|micromark|mdast|hast|unist|vfile|property-information|character-entities|decode-named|space-separated|comma-separated|zwitch|longest-streak|ccount|markdown-table|escape-string-regexp|bail|trough|unified|devlop|estree|html-url-attributes|trim-lines)/.test(
              id
            )
          ) {
            return "markdown"
          }
        },
      },
    },
  },
})
