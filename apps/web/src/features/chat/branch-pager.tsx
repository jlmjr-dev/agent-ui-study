import { ChevronLeft, ChevronRight } from "lucide-react"
import { IconButton } from "@agent-ui-study/ui"

export type BranchPagerProps = {
  index: number
  total: number
  onSelect: (index: number) => void
  label: string
}

/**
 * The "2 / 3" control on a turn that has been edited or regenerated. It only
 * appears when there is somewhere to go, which is what keeps the transcript
 * clean for the ordinary case of a turn with one version.
 */
export function BranchPager({
  index,
  total,
  onSelect,
  label,
}: BranchPagerProps) {
  if (total < 2) return null

  return (
    <div className="flex items-center gap-0.5 text-[11px] text-text-faint">
      <IconButton
        size="sm"
        label={`Previous ${label}`}
        disabled={index <= 0}
        onClick={() => onSelect(index - 1)}
      >
        <ChevronLeft className="size-3.5" />
      </IconButton>

      <span className="tabular-nums">
        {index + 1} / {total}
      </span>

      <IconButton
        size="sm"
        label={`Next ${label}`}
        disabled={index >= total - 1}
        onClick={() => onSelect(index + 1)}
      >
        <ChevronRight className="size-3.5" />
      </IconButton>
    </div>
  )
}
