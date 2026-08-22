import { MODELS, modelInfo, type ModelId } from "@agent-ui-study/protocol"
import { Check, ChevronDown } from "lucide-react"
import { Menu } from "@agent-ui-study/ui"

export function ModelPicker({
  value,
  onChange,
}: {
  value: ModelId
  onChange: (next: ModelId) => void
}) {
  return (
    <Menu
      align="start"
      className="min-w-64"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-medium text-text-muted focus-ring transition-colors hover:bg-surface-raised hover:text-text"
        >
          {modelInfo(value).name}
          <ChevronDown className="size-3.5" />
        </button>
      )}
      items={MODELS.map((model) => ({
        id: model.id,
        label: model.name,
        icon:
          model.id === value ? (
            <Check className="size-3.5 text-accent" />
          ) : (
            <span className="size-3.5" />
          ),
        hint: model.reasons ? "thinks" : undefined,
        onSelect: () => onChange(model.id),
      }))}
    />
  )
}
