/**
 * An iframe is its own document, so by default it follows the operating
 * system rather than this app's theme: a dark page would frame a lit white
 * slab, and an artifact that declares `color-scheme: light dark` still
 * resolves against the OS rather than against the panel it is sitting in.
 *
 * The declaration is marked important because the artifact's own stylesheet
 * comes later in the cascade and would otherwise win. Inside a themed panel
 * the panel's theme is the one that should hold.
 */
export function withColorScheme(html: string, theme: "light" | "dark"): string {
  return `<style>:root{color-scheme:${theme} !important}</style>${html}`
}
