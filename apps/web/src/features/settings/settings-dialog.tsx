import { modelInfo, MODELS, type ModelId } from "@agent-ui-study/protocol"
import { ExternalLink, TriangleAlert } from "lucide-react"
import { Button, Dialog, Field, Input, Switch, Tabs } from "@agent-ui-study/ui"
import { useState } from "react"

import { ThemeToggle } from "@/features/theme/theme-toggle"
import { useStore } from "@/services/store-context"

import { LIVE_PROVIDERS, liveKey } from "./live-provider"
import { useSettings, type LiveProviderId } from "./settings-context"

/**
 * Suggestions, not a supported list. Every one of these speaks the same Chat
 * Completions dialect, which is the whole reason one adapter reaches all of
 * them, and the field stays a free text input because the next one will not
 * be on any list either.
 */
const BASE_URLS = [
  "https://api.openai.com/v1",
  "https://openrouter.ai/api/v1",
  "https://api.groq.com/openai/v1",
  "https://api.deepseek.com/v1",
  "https://api.mistral.ai/v1",
  "https://generativelanguage.googleapis.com/v1beta/openai",
  "http://localhost:11434/v1",
  "http://localhost:1234/v1",
]

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

  function chooseProvider(next: LiveProviderId) {
    set("liveProvider", next)

    // The toggle belongs to a key. Carrying it across to a provider that has
    // none would leave the switch on and every run silently scripted.
    if (!liveKey({ ...settings, liveProvider: next })) {
      set("useLiveProvider", false)
    }
  }

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
              interface at a real API.
            </p>
          </div>

          <Row label="Provider" hint="Both speak to the same interface.">
            <Tabs
              label="Provider"
              value={settings.liveProvider}
              onChange={chooseProvider}
              options={LIVE_PROVIDERS.map((provider) => ({
                value: provider.id,
                label: provider.label,
              }))}
            />
          </Row>

          <Row label="Use the live API" hint="Requires a key below.">
            <Switch
              label="Use the live API"
              checked={settings.useLiveProvider}
              disabled={!liveKey(settings)}
              onChange={(next) => set("useLiveProvider", next)}
            />
          </Row>

          {settings.liveProvider === "anthropic" ? (
            <AnthropicFields />
          ) : (
            <OpenAiFields />
          )}

          <p className="flex gap-2 rounded-lg border border-warning/35 bg-warning/8 p-2.5 text-[12px] leading-5 text-text-muted">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
            <span>
              A key in the browser is visible to anything running on the page.
              It is acceptable here because there is no server and the key is
              your own, but a real product would proxy these calls instead.
            </span>
          </p>
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

function AnthropicFields() {
  const { settings, set } = useSettings()

  return (
    <>
      <Field
        label="API key"
        htmlFor="anthropic-key"
        hint="Stored in this browser's localStorage and sent straight to the API from this page."
      >
        <Input
          id="anthropic-key"
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

      <KeyLink href="https://platform.claude.com/settings/keys" />
    </>
  )
}

function OpenAiFields() {
  const { settings, set } = useSettings()

  function setModel(id: ModelId, value: string) {
    set("openaiModels", { ...settings.openaiModels, [id]: value })
  }

  return (
    <>
      <Field
        label="API key"
        htmlFor="openai-key"
        hint="Stored in this browser's localStorage and sent straight to the endpoint from this page."
      >
        <Input
          id="openai-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-…"
          value={settings.openaiApiKey}
          onChange={(event) => {
            set("openaiApiKey", event.target.value)
            if (!event.target.value) set("useLiveProvider", false)
          }}
        />
      </Field>

      <Field
        label="Base URL"
        htmlFor="openai-base-url"
        hint="Anything that speaks Chat Completions: OpenAI, OpenRouter, Groq, Together, a local Ollama or vLLM."
      >
        <Input
          id="openai-base-url"
          list="openai-base-urls"
          autoComplete="off"
          spellCheck={false}
          className="font-mono text-[12px]"
          placeholder="https://api.openai.com/v1"
          value={settings.openaiBaseUrl}
          onChange={(event) => set("openaiBaseUrl", event.target.value)}
        />
        <datalist id="openai-base-urls">
          {BASE_URLS.map((url) => (
            <option key={url} value={url} />
          ))}
        </datalist>
      </Field>

      <Field
        label="Model per tier"
        hint="Model names are the one thing these endpoints never agree on, so the tiers are yours to map."
      >
        <div className="grid gap-1.5">
          {MODELS.map((model) => (
            <div key={model.id} className="flex items-center gap-3">
              <label
                htmlFor={`openai-model-${model.id}`}
                className="w-20 shrink-0 text-[13px] text-text"
              >
                {model.name}
              </label>
              <Input
                id={`openai-model-${model.id}`}
                autoComplete="off"
                spellCheck={false}
                className="h-8 font-mono text-[12px]"
                value={settings.openaiModels[model.id] ?? ""}
                onChange={(event) => setModel(model.id, event.target.value)}
              />
            </div>
          ))}
        </div>
      </Field>

      <p className="text-[12px] leading-5 text-text-faint">
        Thinking blocks appear only if the endpoint streams reasoning back. Chat
        Completions has no field for it in the spec, so this reads the two that
        have caught on, and shows nothing when neither is sent.
      </p>

      <KeyLink href="https://platform.openai.com/api-keys" />
    </>
  )
}

function KeyLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 text-[13px] text-accent hover:underline"
    >
      Get a key
      <ExternalLink className="size-3" />
    </a>
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
