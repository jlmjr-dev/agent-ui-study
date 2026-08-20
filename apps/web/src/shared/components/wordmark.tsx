import { cn } from "@agent-ui-study/ui"

/**
 * Drawn rather than imported: three strokes converging on a point, for a loop
 * that keeps calling back into itself. No image files anywhere in this repo.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="agent-ui-study"
      className={cn("size-6 text-accent", className)}
    >
      <circle cx="16" cy="16" r="15" className="fill-accent-soft" />
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 22c0-5.5 3-9 7-9s7 3.5 7 9" />
        <path d="M16 13V7" />
        <circle cx="16" cy="24" r="1.6" fill="currentColor" stroke="none" />
      </g>
    </svg>
  )
}
