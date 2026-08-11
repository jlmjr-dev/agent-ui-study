import path from "node:path"
import { defineConfig } from "vitest/config"

const root = import.meta.dirname

export default defineConfig({
  resolve: {
    alias: {
      "@agent-ui-study/protocol": path.resolve(root, "packages/protocol/src"),
      "@agent-ui-study/tools": path.resolve(root, "packages/tools/src"),
      "@agent-ui-study/engine": path.resolve(root, "packages/engine/src"),
      "@agent-ui-study/ui": path.resolve(root, "packages/ui/src"),
      "@": path.resolve(root, "apps/web/src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "packages/*/src/**/*.test.{ts,tsx}",
      "apps/*/src/**/*.test.{ts,tsx}",
    ],
  },
})
