import js from "@eslint/js"
import { defineConfig, globalIgnores } from "eslint/config"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig([
  globalIgnores(["**/dist", "coverage"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Dropping a field by destructuring it out is the clearest way to
      // strip one, so an underscore marks the binding as deliberately unused.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // Variant helpers live beside the primitive they style, which the
    // react-refresh rule flags. That is the intended shape for these.
    files: ["packages/ui/src/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // Contexts export a provider component and the hook that reads it. The
    // pair belongs in one file even though fast-refresh prefers otherwise.
    files: ["apps/web/src/**/*-context.tsx", "apps/web/src/app/providers.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
])
