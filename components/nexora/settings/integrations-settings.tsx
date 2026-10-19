import { useState } from "react"
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Cloud,
  Code2,
  Copy,
  CreditCard,
  ExternalLink,
  Key,
  Mail,
  MessageSquare,
  Plug,
  RefreshCw,
  Search,
  Settings2,
  Sliders,
  Sparkles,
  Workflow,
  X,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type IntegrationCategory =
  | "Communication"
  | "Productivity"
  | "Automation"
  | "Payments"
  | "Storage"

type Integration = {
  id: string
  name: string
  description: string
  category: IntegrationCategory
  icon: typeof Mail
  connected: boolean
  popular?: boolean
  lastSynced?: string
}

// -----------------------------------------------------------------------------
// Data
// -----------------------------------------------------------------------------

const initialIntegrations: Integration[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Sync emails, threads, and manage customer communications seamlessly.",
    category: "Communication",
    icon: Mail,
    connected: true,
    popular: true,
    lastSynced: "10 mins ago",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Receive instant CRM notifications and stage updates in Slack channels.",
    category: "Communication",
    icon: MessageSquare,
    connected: false,
    popular: true,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync client meetings, sales calls, and scheduled follow-ups.",
    category: "Productivity",
    icon: CalendarDays,
    connected: true,
    popular: true,
    lastSynced: "1 hour ago",
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    description: "Connect Outlook email, contact sync, and calendar events.",
    category: "Productivity",
    icon: Mail,
    connected: false,
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Automate complex workflows between Nexora and 5,000+ apps.",
    category: "Automation",
    icon: Workflow,
    connected: false,
    popular: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Sync customer payment activity, invoices, and subscriptions with CRM records.",
    category: "Payments",
    icon: CreditCard,
    connected: false,
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Access, attach, and organize customer-related documents and contracts.",
    category: "Storage",
    icon: Cloud,
    connected: false,
  },
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Send realtime event payloads directly to your internal custom applications.",
    category: "Automation",
    icon: Plug,
    connected: false,
  },
]

const categories = [
  "All",
  "Communication",
  "Productivity",
  "Automation",
  "Payments",
  "Storage",
] as const

type CategoryFilter = (typeof categories)[number]

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function IntegrationsSettings() {
  const [integrations, setIntegrations] =
    useState<Integration[]>(initialIntegrations)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] =
    useState<CategoryFilter>("All")
  const [showConnectedOnly, setShowConnectedOnly] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedIntegration, setSelectedIntegration] =
    useState<Integration | null>(null)
  const [apiKeyCopied, setApiKeyCopied] = useState(false)

  const connectedCount = integrations.filter((item) => item.connected).length

  const filteredIntegrations = integrations.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())

    const matchesCategory =
      activeCategory === "All" || item.category === activeCategory

    const matchesConnected = !showConnectedOnly || item.connected

    return matchesSearch && matchesCategory && matchesConnected
  })

  const toggleIntegration = (id: string) => {
    const target = integrations.find((item) => item.id === id)
    if (!target) return

    const nextState = !target.connected

    setIntegrations((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              connected: nextState,
              lastSynced: nextState ? "Just now" : undefined,
            }
          : item
      )
    )

    setNotice(
      nextState
        ? `Successfully connected ${target.name}.`
        : `Disconnected ${target.name}.`
    )
    setTimeout(() => setNotice(null), 4000)
  }

  const handleRefresh = () => {
    setIsSyncing(true)
    setTimeout(() => {
      setIsSyncing(false)
      setNotice("All integration statuses have been refreshed.")
      setTimeout(() => setNotice(null), 3000)
    }, 1000)
  }

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText("nx_live_994a02f883b120c85d7e")
    setApiKeyCopied(true)
    setTimeout(() => setApiKeyCopied(false), 2000)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Integrations & Apps</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Connect your tech stack to automate workflows and sync data with Nexora.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isSyncing}
          className="self-start sm:self-auto"
        >
          <RefreshCw className={`mr-2 size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Refreshing..." : "Sync Status"}
        </Button>
      </div>

      {/* Dynamic Notification Banner */}
      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-emerald-700/60 hover:text-emerald-700 dark:text-emerald-400/60 dark:hover:text-emerald-400"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Overview Analytics Bar */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Catalog
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
              <Plug className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tabular-nums">{integrations.length}</span>
            <span className="text-xs text-muted-foreground">available</span>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Active Connections
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BadgeCheck className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {connectedCount}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round((connectedCount / integrations.length) * 100)}% enabled
            </span>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Sync Health
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tabular-nums text-primary">100%</span>
            <span className="text-xs text-muted-foreground">Operational</span>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search integrations by name or description..."
              className="pl-9 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <Button
            type="button"
            variant={showConnectedOnly ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowConnectedOnly((prev) => !prev)}
            className="self-start text-xs sm:self-auto"
          >
            <Sliders className="mr-1.5 size-3.5" />
            {showConnectedOnly ? "Showing Connected Only" : "Filter Connected"}
          </Button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 border-b pb-4">
          {categories.map((cat) => {
            const count =
              cat === "All"
                ? integrations.length
                : integrations.filter((i) => i.category === cat).length

            return (
              <Button
                key={cat}
                type="button"
                size="sm"
                variant={activeCategory === cat ? "default" : "ghost"}
                onClick={() => setActiveCategory(cat)}
                className="h-8 rounded-full text-xs"
              >
                {cat}
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] ${
                    activeCategory === cat
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Integrations Grid */}
      {filteredIntegrations.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredIntegrations.map((item) => {
            const Icon = item.icon

            return (
              <div
                key={item.id}
                className={`group relative flex flex-col justify-between rounded-xl border bg-card p-5 transition-all hover:shadow-xs ${
                  item.connected ? "border-emerald-500/30" : "hover:border-primary/40"
                }`}
              >
                <div>
                  {/* Top Bar inside Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex size-11 items-center justify-center rounded-xl border ${
                        item.connected
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted/50 text-foreground"
                      }`}
                    >
                      <Icon className="size-5" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.connected ? (
                        <Badge className="gap-1 border-0 bg-emerald-500/10 text-[11px] font-medium text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Connected
                        </Badge>
                      ) : item.popular ? (
                        <Badge variant="secondary" className="text-[11px] font-normal">
                          Popular
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{item.name}</h3>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {item.category}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-5 pt-3 border-t flex items-center gap-2">
                  <Button
                    className="flex-1 text-xs"
                    size="sm"
                    variant={item.connected ? "outline" : "default"}
                    onClick={() => toggleIntegration(item.id)}
                  >
                    {item.connected ? "Disconnect" : "Connect"}
                  </Button>

                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    title={`Configure ${item.name}`}
                    onClick={() => setSelectedIntegration(item)}
                  >
                    <Settings2 className="size-3.5" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    title="Documentation"
                    onClick={() =>
                      setNotice(`Opening documentation for ${item.name}...`)
                    }
                  >
                    <ExternalLink className="size-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Search className="size-5 text-muted-foreground" />
          </div>
          <h3 className="mt-3 font-semibold">No integrations found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            We couldn't find any app matching "{search}".
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 text-xs"
            onClick={() => {
              setSearch("")
              setActiveCategory("All")
              setShowConnectedOnly(false)
            }}
          >
            Reset Filters
          </Button>
        </div>
      )}

      {/* Developer API & Webhooks Section */}
      <section className="rounded-xl border bg-card text-card-foreground shadow-xs">
        <div className="flex items-center justify-between border-b p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Code2 className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Developer API & Custom Webhooks</h3>
              <p className="text-xs text-muted-foreground">
                Build bespoke integrations or stream CRM events to your own servers.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[11px] font-mono">
            API v2.0
          </Badge>
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="api-key" className="text-xs">
              Live Production API Key
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type="password"
                  readOnly
                  value="nx_live_994a02f883b120c85d7e"
                  className="font-mono text-xs pr-10"
                />
                <Key className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
              <Button size="sm" variant="outline" onClick={handleCopyApiKey}>
                <Copy className="mr-1.5 size-3.5" />
                {apiKeyCopied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Looking to configure outgoing endpoints? Head to the{" "}
            <button
              onClick={() =>
                setNotice("Webhook management console loaded.")
              }
              className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Webhook Console
            </button>{" "}
            to configure signature secrets and payload filters.
          </p>
        </div>
      </section>

      {/* Modal / Dialog for Integration Settings */}
      {selectedIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  {/* Dynamic icon render */}
                  {(() => {
                    const IconComp = selectedIntegration.icon
                    return <IconComp className="size-5" />
                  })()}
                </div>
                <div>
                  <h3 className="font-semibold">{selectedIntegration.name} Settings</h3>
                  <p className="text-xs text-muted-foreground">
                    Configure synchronization preferences
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIntegration(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Sync Frequency</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="realtime">Real-time (Instant)</option>
                  <option value="15min">Every 15 minutes</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily summary</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Permissions & Data Scope</Label>
                <div className="space-y-2 rounded-lg border p-3 text-xs text-muted-foreground">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <span>Read contacts and account records</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <span>Write and update activity logs</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <span>Export opportunity pipeline metrics</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIntegration(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedIntegration(null)
                  setNotice(`Settings updated for ${selectedIntegration.name}.`)
                  setTimeout(() => setNotice(null), 3000)
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}