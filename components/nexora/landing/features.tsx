"use client"

import {
  BarChart3,
  CalendarDays,
  Code2,
  Layers3,
  Moon,
  MonitorSmartphone,
  Palette,
  Search,
  Table2,
} from "lucide-react"

import { Section } from "./section"
import { SectionHeading } from "./section-heading"
import { Item, Reveal, Stagger } from "./motion"

const features = [
  {
    icon: Layers3,
    title: "Reusable components",
    description:
      "Build faster with reusable CRM interfaces and shadcn/ui components.",
    iconBg: "bg-gradient-to-br from-indigo-500 to-violet-600",
  },
  {
    icon: Table2,
    title: "Powerful data tables",
    description:
      "Manage leads, contacts, deals, and team data with flexible tables.",
    iconBg: "bg-gradient-to-br from-cyan-500 to-blue-600",
  },
  {
    icon: BarChart3,
    title: "Rich analytics",
    description:
      "Turn CRM data into clear metrics, charts, and pipeline insights.",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
  },
  {
    icon: CalendarDays,
    title: "Activities & calendar",
    description:
      "Keep meetings, tasks, and follow-ups organized in one place.",
    iconBg: "bg-gradient-to-br from-orange-500 to-amber-600",
  },
  {
    icon: MonitorSmartphone,
    title: "Fully responsive",
    description:
      "Polished interfaces designed for desktop, tablet, and mobile.",
    iconBg: "bg-gradient-to-br from-sky-500 to-indigo-600",
  },
  {
    icon: Code2,
    title: "Developer friendly",
    description:
      "Built with React, TypeScript, TanStack Start, and a clean structure.",
    iconBg: "bg-gradient-to-br from-slate-600 to-slate-900",
  },
  {
    icon: Moon,
    title: "Dark & light mode",
    description:
      "A complete theme system with polished dark and light experiences.",
    iconBg: "bg-gradient-to-br from-violet-500 to-purple-700",
  },
  {
    icon: Search,
    title: "Search & filtering",
    description:
      "Quickly find the records and information you need across the CRM.",
    iconBg: "bg-gradient-to-br from-pink-500 to-rose-600",
  },
  {
    icon: Palette,
    title: "Modern UI system",
    description:
      "A consistent interface built with shadcn/ui and Tailwind CSS.",
    iconBg: "bg-gradient-to-br from-fuchsia-500 to-purple-600",
  },
]

export function Features() {
  return (
    <Section id="features">
      {/* Section Heading */}
      <Reveal>
        <SectionHeading
          eyebrow="FEATURES"
          title="Everything you need to build a serious CRM."
          description="A polished foundation with the essential tools developers need to build and customize a modern CRM."
        />
      </Reveal>

      {/* Feature Grid */}
      <Stagger
        delay={0.05}
        className="mt-14 grid overflow-hidden rounded-2xl border bg-background sm:grid-cols-2 lg:grid-cols-3"
      >
        {features.map((feature) => {
          const Icon = feature.icon

          return (
            <Item
              key={feature.title}
              className="
                border-b border-r
                p-6
                transition-colors
                hover:bg-muted/30
                sm:p-7

                sm:[&:nth-child(2n)]:border-r-0
                sm:[&:nth-last-child(-n+2)]:border-b-0

                lg:[&:nth-child(2n)]:border-r
                lg:[&:nth-child(3n)]:border-r-0
                lg:[&:nth-last-child(-n+3)]:border-b-0
              "
            >
              {/* Gradient Icon Box */}
              <div className="flex size-11 items-center justify-center rounded-lg border border-border p-0.5 shadow">
                <div
                  className={`flex size-full items-center justify-center rounded-md text-white ${feature.iconBg}`}
                >
                  <Icon className="size-5" />
                </div>
              </div>

              <h3 className="mt-4 text-sm font-semibold">
                {feature.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {feature.description}
              </p>
            </Item>
          )
        })}
      </Stagger>
    </Section>
  )
}