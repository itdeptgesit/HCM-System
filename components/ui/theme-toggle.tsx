"use client"

import * as React from "react"
import {
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  SunIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

const themes = [
  { value: "light", icon: SunIcon, label: "Light" },
  { value: "dark", icon: MoonIcon, label: "Dark" },
  { value: "system", icon: MonitorIcon, label: "System" },
] as const

interface ThemeToggleProps {
  compact?: boolean
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  if (compact) {
    const Icon = theme === "dark" ? MoonIcon : SunIcon

    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        className="flex size-8 items-center justify-center rounded-full bg-background transition-colors hover:bg-muted"
      >
        <Icon className="size-4" />
      </button>
    )
  }

  return (
    <div className="flex items-center justify-between px-2 py-1.5">
      <div className="flex items-center gap-2 text-sm">
        <PaletteIcon className="size-4 text-muted-foreground" />
        <span className="font-medium">Theme</span>
      </div>

      <div className="relative flex items-center gap-0.5 rounded-full border bg-muted/50 p-0.5">
        {themes.map(({ value, icon: Icon, label }) => {
          const active = theme === value

          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-label={label}
              className={cn(
                "relative flex size-6 items-center justify-center rounded-full transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <span className="absolute inset-0 rounded-full bg-background shadow-sm ring-1 ring-border" />
              )}

              <Icon className="relative size-3" />
            </button>
          )
        })}
      </div>
    </div>
  )
}