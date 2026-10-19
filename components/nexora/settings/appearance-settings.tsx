import { useEffect, useState } from "react"
import {
  Check,
  CheckCircle2,
  LayoutDashboard,
  Monitor,
  Moon,
  Palette,
  PanelLeft,
  RotateCcw,
  Sun,
  Zap,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"

const themes = [
  {
    id: "light",
    label: "Light",
    description: "Crisp and bright interface optimized for daylight.",
    icon: Sun,
  },
  {
    id: "dark",
    label: "Dark",
    description: "Sleek high-contrast interface for low-light environments.",
    icon: Moon,
  },
  {
    id: "system",
    label: "System",
    description: "Automatically matches your operating system preference.",
    icon: Monitor,
  },
] as const

const accentColors = [
  { id: "blue", label: "Blue", value: "#2563eb" },
  { id: "violet", label: "Violet", value: "#7c3aed" },
  { id: "indigo", label: "Indigo", value: "#4f46e5" },
  { id: "green", label: "Green", value: "#16a34a" },
  { id: "orange", label: "Orange", value: "#ea580c" },
  { id: "rose", label: "Rose", value: "#e11d48" },
  { id: "teal", label: "Teal", value: "#0d9488" },
  { id: "slate", label: "Slate", value: "#475569" },
] as const

type Theme = (typeof themes)[number]["id"]
type Accent = (typeof accentColors)[number]["id"]
type Density = "comfortable" | "compact"
type SidebarMode = "expanded" | "icon-only"

const STORAGE_KEY = "nexora_appearance_settings"

export function AppearanceSettings() {
  const [theme, setTheme] = useState<Theme>("light")
  const [accent, setAccent] = useState<Accent>("indigo")
  const [density, setDensity] = useState<Density>("comfortable")
  const [sidebar, setSidebar] = useState<SidebarMode>("expanded")

  const [savedStatus, setSavedStatus] = useState<string | null>(null)

  // Load persisted preferences on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.theme) setTheme(parsed.theme)
        if (parsed.accent) setAccent(parsed.accent)
        if (parsed.density) setDensity(parsed.density)
        if (parsed.sidebar) setSidebar(parsed.sidebar)
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, [])

  const selectedAccent =
    accentColors.find((color) => color.id === accent) ?? accentColors[2]

  function handleSave() {
    const preferences = { theme, accent, density, sidebar }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
      setSavedStatus("Appearance preferences saved successfully!")
      setTimeout(() => setSavedStatus(null), 3000)
    } catch {
      setSavedStatus("Failed to save settings.")
    }
  }

  function handleReset() {
    setTheme("light")
    setAccent("indigo")
    setDensity("comfortable")
    setSidebar("expanded")
    setSavedStatus(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Appearance Settings</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Customize the aesthetic, layout spacing, and navigation behavior of your workspace.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
        >
          <RotateCcw className="mr-1.5 size-3.5" />
          Reset to defaults
        </Button>
      </div>

      <div className="space-y-6">
        {/* Section 1: Theme Mode */}
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs">
          <div className="flex items-center gap-3 border-b p-5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Palette className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Interface Theme</h3>
              <p className="text-xs text-muted-foreground">
                Select your preferred visual theme mode.
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-3">
            {themes.map((option) => {
              const Icon = option.icon
              const isSelected = theme === option.id

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  aria-pressed={isSelected}
                  className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all hover:border-primary/50 focus:outline-hidden ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Visual Card Preview */}
                    <div
                      className={`flex h-20 items-center justify-center rounded-lg border ${
                        option.id === "dark"
                          ? "border-slate-800 bg-slate-950"
                          : "border-border bg-muted/30"
                      }`}
                    >
                      {option.id === "system" ? (
                        <div className="flex h-12 w-20 overflow-hidden rounded-md border bg-background shadow-xs">
                          <div className="flex w-1/2 items-center justify-center bg-background">
                            <Sun className="size-4 text-amber-500" />
                          </div>
                          <div className="flex w-1/2 items-center justify-center bg-slate-900">
                            <Moon className="size-4 text-indigo-400" />
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`flex h-12 w-20 items-center gap-2 rounded-md border p-2 shadow-xs ${
                            option.id === "dark"
                              ? "border-slate-800 bg-slate-900"
                              : "bg-background"
                          }`}
                        >
                          <div
                            className={`h-full w-3.5 rounded-xs ${
                              option.id === "dark" ? "bg-slate-700" : "bg-muted"
                            }`}
                          />
                          <div className="flex flex-1 flex-col gap-1">
                            <div
                              className={`h-1.5 w-full rounded-xs ${
                                option.id === "dark" ? "bg-slate-600" : "bg-muted"
                              }`}
                            />
                            <div
                              className={`h-1.5 w-2/3 rounded-xs ${
                                option.id === "dark" ? "bg-slate-700" : "bg-muted/80"
                              }`}
                            />
                            <div
                              className="mt-1 h-2 w-5 rounded-xs"
                              style={{ backgroundColor: selectedAccent.value }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 text-foreground" />
                          <span className="text-sm font-semibold">{option.label}</span>
                        </div>
                        {isSelected && (
                          <div className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-3" />
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Section 2: Accent Color */}
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs">
          <div className="flex items-center gap-3 border-b p-5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Zap className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Accent Color</h3>
              <p className="text-xs text-muted-foreground">
                Set active highlight colors across buttons, badges, and focus rings.
              </p>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {accentColors.map((color) => {
                const isSelected = accent === color.id

                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setAccent(color.id)}
                    aria-pressed={isSelected}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full shadow-xs"
                      style={{ backgroundColor: color.value }}
                    >
                      {isSelected && <Check className="size-3.5 text-white" />}
                    </span>
                    <span className="text-xs font-medium">{color.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Section 3: Interface Density & Sidebar Behavior */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Interface Density */}
          <section className="flex flex-col justify-between rounded-xl border bg-card text-card-foreground shadow-xs">
            <div>
              <div className="border-b p-5">
                <h3 className="text-sm font-semibold">Interface Density</h3>
                <p className="text-xs text-muted-foreground">
                  Control element padding and compact grid spacing.
                </p>
              </div>

              <div className="grid gap-3 p-5">
                <button
                  type="button"
                  onClick={() => setDensity("comfortable")}
                  className={`flex items-center justify-between rounded-lg border p-3.5 text-left transition-all ${
                    density === "comfortable"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold">Comfortable</p>
                    <p className="text-[11px] text-muted-foreground">
                      Spacious layout with room to breathe.
                    </p>
                  </div>
                  {density === "comfortable" && (
                    <div className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setDensity("compact")}
                  className={`flex items-center justify-between rounded-lg border p-3.5 text-left transition-all ${
                    density === "compact"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold">Compact</p>
                    <p className="text-[11px] text-muted-foreground">
                      Tighter padding to maximize content density.
                    </p>
                  </div>
                  {density === "compact" && (
                    <div className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </div>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Sidebar Mode */}
          <section className="flex flex-col justify-between rounded-xl border bg-card text-card-foreground shadow-xs">
            <div>
              <div className="flex items-center gap-2 border-b p-5">
                <PanelLeft className="size-4 text-muted-foreground" />
                <div>
                  <h3 className="text-sm font-semibold">Sidebar Mode</h3>
                  <p className="text-xs text-muted-foreground">
                    Default layout state of the navigation panel.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 p-5">
                <button
                  type="button"
                  onClick={() => setSidebar("expanded")}
                  className={`flex items-center justify-between rounded-lg border p-3.5 text-left transition-all ${
                    sidebar === "expanded"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold">Expanded</p>
                    <p className="text-[11px] text-muted-foreground">
                      Full view with text labels and icon badges.
                    </p>
                  </div>
                  {sidebar === "expanded" && (
                    <div className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSidebar("icon-only")}
                  className={`flex items-center justify-between rounded-lg border p-3.5 text-left transition-all ${
                    sidebar === "icon-only"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold">Icon Only</p>
                    <p className="text-[11px] text-muted-foreground">
                      Collapsed rail with icon navigation only.
                    </p>
                  </div>
                  {sidebar === "icon-only" && (
                    <div className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </div>
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Section 4: Live Preview */}
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs">
          <div className="border-b p-5">
            <h3 className="text-sm font-semibold">Live Preview</h3>
            <p className="text-xs text-muted-foreground">
              Real-time demonstration of your active customization settings.
            </p>
          </div>

          <div className="p-5">
            <div className="overflow-hidden rounded-lg border bg-background shadow-xs">
              <div className="flex items-center gap-3 border-b p-3 bg-muted/20">
                <div className="flex size-7 items-center justify-center rounded-md bg-muted">
                  <LayoutDashboard className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold">Nexora Workspace</p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {theme} theme · {density} · {sidebar} sidebar
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: selectedAccent.value }}
                >
                  Action
                </button>
              </div>

              <div className={`flex ${density === "compact" ? "gap-2 p-2" : "gap-4 p-4"}`}>
                {/* Mock Sidebar */}
                <div
                  className={`flex shrink-0 flex-col items-center gap-2 rounded-md bg-muted/40 transition-all ${
                    sidebar === "expanded" ? "w-24 p-2" : "w-10 p-2"
                  }`}
                >
                  <div className="h-3 w-full rounded-xs bg-muted-foreground/30" />
                  <div className="h-3 w-full rounded-xs bg-muted-foreground/20" />
                  <div className="h-3 w-full rounded-xs bg-muted-foreground/20" />
                </div>

                {/* Mock Main Content */}
                <div className={`min-w-0 flex-1 ${density === "compact" ? "space-y-2" : "space-y-3"}`}>
                  <div className="h-3 w-1/4 rounded-xs bg-muted" />
                  <div
                    className={`rounded-md border bg-card ${
                      density === "compact" ? "p-2.5" : "p-4"
                    }`}
                  >
                    <div className="mb-2 h-2 w-1/3 rounded-xs bg-muted" />
                    <div className="h-2 w-2/3 rounded-xs bg-muted/60" />
                  </div>
                  <div
                    className={`rounded-md border bg-card ${
                      density === "compact" ? "p-2.5" : "p-4"
                    }`}
                  >
                    <div
                      className="h-2 w-1/2 rounded-xs"
                      style={{ backgroundColor: selectedAccent.value }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Status Message */}
        {savedStatus && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{savedStatus}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={handleReset}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  )
}