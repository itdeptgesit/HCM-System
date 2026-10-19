import { useEffect, useState } from "react"
import {
  Activity,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Webhook,
  X,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"

// -----------------------------------------------------------------------------
// Types & data
// -----------------------------------------------------------------------------

type Access = "Read only" | "Read & write"

interface ApiKey {
  id: string
  name: string
  key: string
  access: Access
  createdAt: string
  lastUsed: string
  revoked: boolean
}

interface WebhookEndpoint {
  id: string
  name: string
  url: string
  events: string[]
  active: boolean
  createdAt: string
}

const EVENT_GROUPS: Record<string, string[]> = {
  lead: ["created", "updated", "deleted"],
  deal: ["created", "updated", "won", "lost"],
  activity: ["created"],
  contact: ["created"],
}
const ALL_EVENTS = Object.entries(EVENT_GROUPS).flatMap(([group, actions]) =>
  actions.map((action) => `${group}.${action}`),
)

const INITIAL_KEYS: ApiKey[] = [
  { id: "key-1", name: "Production API", key: "nx_live_demo_8f2a4d6b9c1e", access: "Read & write", createdAt: "Sep 12, 2026", lastUsed: "2 hours ago", revoked: false },
  { id: "key-2", name: "Development", key: "nx_test_demo_3c7e1a5b2d9f", access: "Read only", createdAt: "Aug 25, 2026", lastUsed: "Yesterday", revoked: false },
]

const INITIAL_HOOKS: WebhookEndpoint[] = [
  { id: "hook-1", name: "Production webhook", url: "https://api.example.com/webhooks/nexora", events: ["lead.created", "deal.won", "deal.updated"], active: true, createdAt: "Sep 18, 2026" },
  { id: "hook-2", name: "Development endpoint", url: "https://dev.example.com/hooks/crm", events: ["lead.created", "lead.updated"], active: false, createdAt: "Sep 10, 2026" },
]

const today = () =>
  new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })

const maskKey = (key: string) => `${key.slice(0, 8)}${"•".repeat(16)}${key.slice(-4)}`

const statusClass = (on: boolean) =>
  on
    ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
    : "bg-muted text-muted-foreground hover:bg-muted"

// -----------------------------------------------------------------------------
// Small pieces
// -----------------------------------------------------------------------------

function IconTile({ icon: Icon }: { icon: typeof KeyRound }) {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground">
      <Icon className="size-5" />
    </div>
  )
}

function ConfirmBar({
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  message: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">{message}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" variant="destructive" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof KeyRound; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function ApiWebhooksSettings() {
  const [tab, setTab] = useState<"api" | "webhooks">("api")
  const [apiKeys, setApiKeys] = useState(INITIAL_KEYS)
  const [webhooks, setWebhooks] = useState(INITIAL_HOOKS)
  const [revealed, setRevealed] = useState<string[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [toast, setToast] = useState("")

  const [keyForm, setKeyForm] = useState<{ open: boolean; name: string; access: Access }>({
    open: false,
    name: "",
    access: "Read only",
  })
  const [hookForm, setHookForm] = useState<{ open: boolean; name: string; url: string; events: string[] }>({
    open: false,
    name: "",
    url: "",
    events: ["lead.created"],
  })

  // Toast disappears on its own
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(""), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const activeKeys = apiKeys.filter((k) => !k.revoked).length
  const activeHooks = webhooks.filter((w) => w.active).length

  // ----- API keys -----
  const createKey = () => {
    const name = keyForm.name.trim()
    if (!name) return setToast("Please enter a name for your API key.")

    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      name,
      // Demo value only, not a usable credential
      key: `nx_demo_${Math.random().toString(36).slice(2, 14)}`,
      access: keyForm.access,
      createdAt: today(),
      lastUsed: "Never",
      revoked: false,
    }
    setApiKeys((current) => [newKey, ...current])
    setRevealed((current) => [...current, newKey.id])
    setKeyForm({ open: false, name: "", access: "Read only" })
    setToast("API key created. Copy it now (demo value, not a real credential).")
  }

  const revokeKey = (id: string) => {
    setApiKeys((current) => current.map((k) => (k.id === id ? { ...k, revoked: true } : k)))
    setConfirmId(null)
    setToast("API key revoked.")
  }

  const toggleReveal = (id: string) =>
    setRevealed((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))

  const copyKey = async (apiKey: ApiKey) => {
    try {
      await navigator.clipboard.writeText(apiKey.key)
      setCopiedId(apiKey.id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      setToast("Couldn't copy to the clipboard.")
    }
  }

  // ----- Webhooks -----
  const toggleFormEvent = (event: string) =>
    setHookForm((form) => ({
      ...form,
      events: form.events.includes(event) ? form.events.filter((e) => e !== event) : [...form.events, event],
    }))

  const createHook = () => {
    const name = hookForm.name.trim()
    const url = hookForm.url.trim()
    if (!name || !url) return setToast("Please enter an endpoint name and URL.")

    try {
      const { protocol } = new URL(url)
      if (protocol !== "https:" && protocol !== "http:") throw new Error("protocol")
    } catch {
      return setToast("Please enter a valid HTTP or HTTPS URL.")
    }
    if (hookForm.events.length === 0) return setToast("Select at least one event.")

    setWebhooks((current) => [
      { id: `hook-${Date.now()}`, name, url, events: hookForm.events, active: true, createdAt: today() },
      ...current,
    ])
    setHookForm({ open: false, name: "", url: "", events: ["lead.created"] })
    setToast("Webhook endpoint added. No events are delivered in this demo.")
  }

  const setHookActive = (id: string, active: boolean) =>
    setWebhooks((current) => current.map((w) => (w.id === id ? { ...w, active } : w)))

  const deleteHook = (id: string) => {
    setWebhooks((current) => current.filter((w) => w.id !== id))
    setConfirmId(null)
    setToast("Webhook endpoint removed.")
  }

  const TABS = [
    { id: "api", label: "API keys", icon: KeyRound, count: apiKeys.length },
    { id: "webhooks", label: "Webhooks", icon: Webhook, count: webhooks.length },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">API & Webhooks</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage API access and configure event notifications for your applications.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setToast("Connection status refreshed for demo data.")}
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      {/* Overview */}
      <Card className="gap-0 border py-0 shadow-xs ring-0">
        <div className="grid grid-cols-3 divide-x">
          {[
            { label: "Active API keys", value: activeKeys, hint: `${apiKeys.length} total`, icon: KeyRound },
            { label: "Active webhooks", value: activeHooks, hint: `${webhooks.length} total`, icon: Webhook },
            { label: "Event types", value: ALL_EVENTS.length, hint: "available", icon: Activity },
          ].map(({ label, value, hint, icon: Icon }) => (
            <div key={label} className="space-y-1 p-5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">{label}</span>
                <Icon className="size-4" />
              </div>
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Keep your keys secret.</span> Never expose them in
          client-side code or commit them to source control. The keys on this page are demo values.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b">
        {TABS.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id)
              setConfirmId(null)
            }}
            className={`-mb-px flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
              tab === id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-4" />
            {label}
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] leading-none">{count}</span>
          </button>
        ))}
      </div>

      {/* API keys */}
      {tab === "api" && (
        <Card className="gap-0 border py-0 shadow-xs ring-0">
          <div className="flex items-center justify-between gap-4 border-b p-5">
            <div>
              <h2 className="text-base font-semibold">API keys</h2>
              <p className="text-sm text-muted-foreground">Credentials for accessing the CRM API.</p>
            </div>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setKeyForm((f) => ({ ...f, open: !f.open, name: "" }))}
            >
              {keyForm.open ? <X className="size-4" /> : <Plus className="size-4" />}
              {keyForm.open ? "Cancel" : "Create key"}
            </Button>
          </div>

          {keyForm.open && (
            <div className="grid gap-5 border-b bg-muted/30 p-5">
              <div className="grid gap-2">
                <Label htmlFor="key-name">Key name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. Mobile app"
                  value={keyForm.name}
                  onChange={(e) => setKeyForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Access</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Read only", "Read & write"] as const).map((access) => (
                    <button
                      key={access}
                      type="button"
                      onClick={() => setKeyForm((f) => ({ ...f, access }))}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        keyForm.access === access ? "border-primary bg-primary/5" : "bg-background hover:bg-muted/50"
                      }`}
                    >
                      <span className="font-medium">{access}</span>
                      <span className="block text-xs text-muted-foreground">
                        {access === "Read only" ? "View data only" : "Create and update data"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={createKey}>Create key</Button>
              </div>
            </div>
          )}

          {apiKeys.length === 0 ? (
            <EmptyState icon={KeyRound} title="No API keys yet" text="Create a key to get started." />
          ) : (
            <ul className="divide-y">
              {apiKeys.map((apiKey) => {
                const shown = revealed.includes(apiKey.id)
                return (
                  <li key={apiKey.id} className={`p-5 ${apiKey.revoked ? "opacity-60" : ""}`}>
                    <div className="flex items-start gap-4">
                      <IconTile icon={KeyRound} />
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-medium">{apiKey.name}</h3>
                          <Badge variant="secondary" className={statusClass(!apiKey.revoked)}>
                            {apiKey.revoked ? "Revoked" : "Active"}
                          </Badge>
                          <Badge variant="outline">{apiKey.access}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Created {apiKey.createdAt} · Last used {apiKey.lastUsed}
                        </p>

                        <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 py-1.5 pl-3 pr-1.5">
                          <code className="truncate text-xs text-muted-foreground">
                            {shown ? apiKey.key : maskKey(apiKey.key)}
                          </code>
                          <div className="flex shrink-0 items-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              aria-label={shown ? "Hide API key" : "Show API key"}
                              disabled={apiKey.revoked}
                              onClick={() => toggleReveal(apiKey.id)}
                            >
                              {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              aria-label="Copy API key"
                              disabled={apiKey.revoked}
                              onClick={() => copyKey(apiKey)}
                            >
                              {copiedId === apiKey.id ? (
                                <Check className="size-4 text-emerald-500" />
                              ) : (
                                <Copy className="size-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {!apiKey.revoked && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setConfirmId(apiKey.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>

                    {confirmId === apiKey.id && (
                      <ConfirmBar
                        message="Revoke this key? Anything using it will stop working immediately."
                        confirmLabel="Revoke key"
                        onCancel={() => setConfirmId(null)}
                        onConfirm={() => revokeKey(apiKey.id)}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      )}

      {/* Webhooks */}
      {tab === "webhooks" && (
        <Card className="gap-0 border py-0 shadow-xs ring-0">
          <div className="flex items-center justify-between gap-4 border-b p-5">
            <div>
              <h2 className="text-base font-semibold">Webhook endpoints</h2>
              <p className="text-sm text-muted-foreground">Get notified at a URL when CRM events happen.</p>
            </div>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setHookForm((f) => ({ ...f, open: !f.open }))}
            >
              {hookForm.open ? <X className="size-4" /> : <Plus className="size-4" />}
              {hookForm.open ? "Cancel" : "Add endpoint"}
            </Button>
          </div>

          {hookForm.open && (
            <div className="grid gap-5 border-b bg-muted/30 p-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="hook-name">Endpoint name</Label>
                  <Input
                    id="hook-name"
                    placeholder="e.g. Production server"
                    value={hookForm.name}
                    onChange={(e) => setHookForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hook-url">Endpoint URL</Label>
                  <Input
                    id="hook-url"
                    placeholder="https://example.com/webhooks"
                    value={hookForm.url}
                    onChange={(e) => setHookForm((f) => ({ ...f, url: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <Label>Events to send</Label>
                {Object.entries(EVENT_GROUPS).map(([group, actions]) => (
                  <div key={group} className="flex flex-wrap items-center gap-2">
                    <span className="w-20 text-xs font-medium capitalize text-muted-foreground">{group}</span>
                    {actions.map((action) => {
                      const event = `${group}.${action}`
                      const on = hookForm.events.includes(event)
                      return (
                        <button
                          key={event}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleFormEvent(event)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {action}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button onClick={createHook}>Add endpoint</Button>
              </div>
            </div>
          )}

          {webhooks.length === 0 ? (
            <EmptyState icon={Webhook} title="No webhook endpoints" text="Add an endpoint to receive event notifications." />
          ) : (
            <ul className="divide-y">
              {webhooks.map((hook) => (
                <li key={hook.id} className="p-5">
                  <div className="flex items-start gap-4">
                    <IconTile icon={Webhook} />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-medium">{hook.name}</h3>
                          <Badge variant="secondary" className={statusClass(hook.active)}>
                            {hook.active ? "Active" : "Paused"}
                          </Badge>
                        </div>
                        <code className="mt-1 block truncate text-xs text-muted-foreground">{hook.url}</code>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {hook.events.slice(0, 3).map((event) => (
                          <Badge key={event} variant="outline" className="font-mono text-[11px] font-normal">
                            {event}
                          </Badge>
                        ))}
                        {hook.events.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{hook.events.length - 3} more</span>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground">Created {hook.createdAt}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Switch
                        checked={hook.active}
                        onCheckedChange={(checked) => setHookActive(hook.id, checked === true)}
                        aria-label={`${hook.active ? "Pause" : "Enable"} ${hook.name}`}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label={`Delete ${hook.name}`}
                        onClick={() => setConfirmId(hook.id)}
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  {confirmId === hook.id && (
                    <ConfirmBar
                      message="Remove this endpoint? It will stop receiving events."
                      confirmLabel="Remove"
                      onCancel={() => setConfirmId(null)}
                      onConfirm={() => deleteHook(hook.id)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg"
        >
          <p className="text-sm">{toast}</p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToast("")}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}