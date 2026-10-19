import { useEffect, useRef, useState } from "react"
import { Download, RefreshCw, Sparkles } from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"

const STATS = [
  { label: "Pipeline value", value: "$937,000" },
  { label: "Deals won", value: "14" },
  { label: "Active leads", value: "248", live: true },
]

const ONLINE = [
  { initials: "JW", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  { initials: "PS", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  { initials: "DK", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
]

const chip =
  "inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium backdrop-blur-sm"

interface AnalyticsWelcomeBannerProps {
  userName?: string
  onExport?: () => void
  onRefresh?: () => void
}

export function AnalyticsWelcomeBanner({
  userName = "Alex",
  onExport,
  onRefresh,
}: AnalyticsWelcomeBannerProps) {
  const [today, setToday] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Set on the client so the server and browser never disagree about the date
  useEffect(() => {
    const d = new Date()
    const part = (options: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-US", options)
    setToday(`${part({ weekday: "long" })}, ${d.getDate()} ${part({ month: "long" })} ${d.getFullYear()}`)
    return () => clearTimeout(timer.current)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    onRefresh?.()
    timer.current = setTimeout(() => setRefreshing(false), 900)
  }

  return (
    <section className="relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs">
      {/* Background: rings radiating from the top-right corner, plus two soft glows.
          Everything is drawn with theme colors, so it works in light and dark mode. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 text-foreground opacity-[0.09] [background-image:repeating-radial-gradient(circle_at_100%_0%,transparent_0_28px,currentColor_28px_29px)] [mask-image:linear-gradient(to_bottom_left,black,transparent_75%)]"
      />
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-emerald-400/25 blur-3xl dark:bg-emerald-400/15" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/4 size-72 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-400/10" />

      <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
        {/* Left */}
        <div className="min-w-0 space-y-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={chip}>
                <Sparkles className="size-3.5" />
                AI insights refreshed 6m ago
              </span>
              <span className={chip}>
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                Welcome back, {userName}
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Here's how your pipeline is performing today — revenue is trending up{" "}
                <strong className="font-semibold text-foreground">12.4%</strong> against last month, with{" "}
                <strong className="font-semibold text-foreground">3 deals</strong> needing your attention.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between border-t border-border/40 pt-4">
  {/* Stats */}
  <div className="flex flex-wrap items-center divide-x divide-border/60">
    {STATS.map(({ label, value, live }) => (
      <div key={label} className="px-3 sm:px-5 first:pl-0">
        <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap">
          {label}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-lg sm:text-xl font-semibold tabular-nums text-foreground">
          {live && <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />}
          {value}
        </p>
      </div>
    ))}
  </div>

  {/* Online Teammates */}
  <div className="flex items-center gap-2.5 shrink-0">
    <div className="flex -space-x-2">
      {ONLINE.map(({ initials, color }) => (
        <Avatar key={initials} className="size-8 sm:size-9 ring-2 ring-card shrink-0">
          <AvatarFallback className={`text-xs font-medium ${color}`}>{initials}</AvatarFallback>
        </Avatar>
      ))}
      <Avatar className="size-8 sm:size-9 ring-2 ring-card shrink-0">
        <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
          +6
        </AvatarFallback>
      </Avatar>
    </div>
    <span className="text-xs text-muted-foreground whitespace-nowrap">teammates online</span>
  </div>
</div>
        </div>

        {/* Right */}
        <div className="flex shrink-0 flex-col gap-3 lg:items-end">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2 shadow-sm" onClick={onExport}>
              <Download className="size-4" />
              Export Report
            </Button>
            <Button className="gap-2 shadow-sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Data
            </Button>
          </div>
          <p className="min-h-5 text-sm text-muted-foreground">{today}</p>
        </div>
      </div>
    </section>
  )
}