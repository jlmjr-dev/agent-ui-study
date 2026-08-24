import { modelInfo, MODELS } from "@agent-ui-study/protocol"
import { ExternalLink, TriangleAlert } from "lucide-react"
import { Button, Dialog, Field, Input, Switch } from "@agent-ui-study/ui"
import { useState } from "react"

import { ThemeToggle } from "@/features/theme/theme-toggle"
import { useStore } from "@/services/store-context"

import { useSettings } from "./settings-context"

export function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { settings, set } = useSettings()
  const store = useStore()
  const [confirmingReset, setConfirmingReset] = useState(false)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Settings"
      className="sm:max-w-xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="grid gap-6 py-1">
        <Row label="Theme">
          <ThemeToggle />
        </Row>

        <Row
          label="Show thinking"
          hint="Reasoning blocks on the tier that produces them."
        >
          <Switch
            label="Show thinking"
            checked={settings.showThinking}
            onChange={(next) => set("showThinking", next)}
          />
        </Row>

        <Row
          label="Instant replies"
          hint="Skip the streaming delay. Useful when you are reading rather than demoing."
        >
          <Switch
            label="Instant replies"
            checked={settings.instantStream}
            onChange={(next) => set("instantStream", next)}
          />
        </Row>

        <hr className="border-border" />

        <section className="grid gap-3">
          <div>
            <h3 className="text-sm font-semibold text-text">Live model</h3>
            <p className="mt-1 text-[13px] leading-6 text-text-muted">
              Off by default: this build answers from scripted conversations, so
              it runs with nothing configured. Add a key to point the same
              interface at the real Messages API.
            </p>
          </div>

          <Row label="Use the live API" hint="Requires a key below.">
            <Switch
              label="Use the live API"
              checked={settings.useLiveProvider}
              disabled={!settings.apiKey}
              onChange={(next) => set("useLiveProvider", next)}
            />
          </Row>

          <Field
            label="API key"
            htmlFor="api-key"
            hint="Stored in this browser's localStorage and sent straight to the API from this page."
          >
            <Input
              id="api-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-ant-…"
              value={settings.apiKey}
              onChange={(event) => {
                set("apiKey", event.target.value)
                if (!event.target.value) set("useLiveProvider", false)
              }}
            />
          </Field>

          <p className="flex gap-2 rounded-lg border border-warning/35 bg-warning/8 p-2.5 text-[12px] leading-5 text-text-muted">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
            <span>
              A key in the browser is visible to anything running on the page.
              It is acceptable here because there is no server and the key is
              your own, but a real product would proxy these calls instead.
            </span>
          </p>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-surface-raised text-text-muted">
                <tr>
                  <th className="px-2.5 py-1.5 font-medium">Tier</th>
                  <th className="px-2.5 py-1.5 font-medium">Sends</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map((model) => (
                  <tr key={model.id} className="border-t border-border">
                    <td className="px-2.5 py-1.5 text-text">{model.name}</td>
                    <td className="px-2.5 py-1.5 font-mono text-text-muted">
                      {model.apiModel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <a
            href="https://platform.claude.com/settings/keys"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-[13px] text-accent hover:underline"
          >
            Get a key
            <ExternalLink className="size-3" />
          </a>
        </section>

        <hr className="border-border" />

        <Row
          label="Reset everything"
          hint="Deletes every conversation and puts the workspace files back."
        >
          {confirmingReset ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmingReset(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  store.resetAll()
                  setConfirmingReset(false)
                  onClose()
                }}
              >
                Reset
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setConfirmingReset(true)}
            >
              Reset
            </Button>
          )}
        </Row>

        <p className="text-[12px] leading-5 text-text-faint">
          Default tier is {modelInfo("balanced").name}. This is a study rebuild
          of interaction patterns from several assistant interfaces, not a
          product, and it is not affiliated with any of them.
        </p>
      </div>
    </Dialog>
  )
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-text">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-[12px] leading-5 text-text-muted">{hint}</p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
