"use client"

import { useState, type CSSProperties } from "react"
import { Link } from "@tanstack/react-router"
import { motion } from "motion/react"
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  KeyRound,
  LayoutDashboard,
  Play,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"
import { HeroBackground } from "./hero-background"
import { pressable } from "./motion"

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "leads", label: "Leads", icon: UserPlus },
  { id: "team", label: "Teams", icon: Users },
  { id: "auth", label: "Auth", icon: KeyRound },
]

const STACK = [
  "TanStack Start",
  "TanStack Router",
  "React",
  "TypeScript",
  "Tailwind CSS",
  "shadcn/ui",
]

const shot = (id: string, dark = false) =>
  `${import.meta.env.BASE_URL}screenshots/${id}${dark ? "-dark" : ""}.png`

// Stagger step for the CSS entrance animation (70ms each)
const step = (i: number) => ({ "--i": i }) as CSSProperties

export function Hero() {
  const [tab, setTab] = useState(TABS[0])

  return (
    <section id="home" className="relative isolate overflow-hidden">
      <HeroBackground />

      <div className="mx-auto max-w-7xl px-4 pt-28 sm:px-6 sm:pt-32 lg:px-8 lg:pt-36">
        <div className="mx-auto max-w-4xl text-center">
          <div className="hero-in" style={step(0)}>
            <a
              href="#features"
              className="group mb-6 inline-flex items-center gap-2 rounded-full border bg-background/70 py-1 pl-1 pr-3.5 text-xs font-medium shadow-xs backdrop-blur transition-colors hover:bg-muted"
            >
              <span className="flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-background">
                <Sparkles className="size-3" />
                New
              </span>
              Built with TanStack Start + shadcn/ui
              <ArrowRight className="size-3 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          <h1
            className="hero-in text-balance text-4xl font-medium leading-[1.04] tracking-[-0.04em] sm:text-5xl lg:text-6xl"
            style={step(1)}
          >
            The modern CRM
            <br />
            <span className="text-primary">built for developers.</span>
          </h1>

          <p
            className="hero-in mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg"
            style={step(2)}
          >
            Build your next CRM faster with a polished, production-ready
            interface for managing leads, contacts, deals, activities, teams,
            and sales analytics.
          </p>

          <div
            className="hero-in mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={step(3)}
          >
            <motion.div {...pressable}>
              <a
                href="#pricing"
                className={`${buttonVariants({ size: "lg" })} h-11 gap-2 px-6 shadow-lg shadow-foreground/10`}
              >
                Get Nexora
                <ArrowRight className="size-4" />
              </a>
            </motion.div>
            <motion.div {...pressable}>
              <Link
                to="/reports"
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonVariants({ size: "lg", variant: "outline" })} h-11 gap-2 border-foreground/15 bg-background px-6 shadow-sm hover:border-foreground/25 hover:bg-muted`}
              >
                <Play className="size-4 fill-current" />
                Live Preview
              </Link>
            </motion.div>
          </div>

          <div className="hero-in" style={step(4)}>
            <p className="mb-3 mt-6 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Built with modern web technologies
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-2">
              {STACK.map((tech) => (
                <li
                  key={tech}
                  className="rounded-full border bg-background/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:border-foreground/20 hover:bg-background hover:text-foreground"
                >
                  {tech}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Product preview */}
        <div
          className="hero-in mx-auto mt-12 max-w-7xl pb-20 sm:mt-14 sm:pb-24"
          style={step(6)}
        >
          <div className="mb-4 flex justify-center">
            <div
              role="tablist"
              className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border bg-background/80 p-1.5 shadow-xs backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {TABS.map((t) => {
                const active = tab.id === t.id

                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={active}
                    aria-label={t.label}
                    onClick={() => setTab(t)}
                    className={`relative flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-colors sm:px-4 ${active
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="hero-tab"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                        className="absolute inset-0 rounded-full bg-primary shadow-xs"
                      />
                    )}
                    <t.icon className="relative size-3.5" />
                    <span className={`relative ${active ? "" : "hidden sm:inline"}`}>
                      {t.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-background shadow-2xl ring-1 ring-foreground/5">
            <div className="flex h-10 items-center justify-between border-b bg-muted/40 px-4">
              <div className="flex items-center gap-1.5">
                {["bg-rose-400/70", "bg-amber-400/70", "bg-emerald-400/70"].map(
                  (c) => (
                    <span key={c} className={`size-2.5 rounded-full ${c}`} />
                  )
                )}
              </div>
              <div className="mx-auto hidden h-6 w-72 items-center justify-center rounded-md border bg-background text-[11px] text-muted-foreground sm:flex">
                app.nexora.crm/{tab.id}
              </div>
              <span className="inline-flex w-12 items-center justify-end gap-1 text-[10px] text-muted-foreground">
                <CheckCircle2 className="size-3 text-emerald-500" />
                Live
              </span>
            </div>

            <motion.div
              key={tab.id}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="bg-muted/20"
            >
              <img
                src={shot(tab.id)}
                alt={`${tab.label} screenshot`}
                className="block h-auto w-full dark:hidden"
              />
              <img
                src={shot(tab.id, true)}
                alt=""
                aria-hidden
                className="hidden h-auto w-full dark:block"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}