"use client"

import {
  ArrowRight,
  Check,
  Code2,
  Download,
  LifeBuoy,
  Palette,
  ShieldCheck,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { Section } from "./section"
import { SectionHeading } from "./section-heading"
import { Item, Reveal, Stagger } from "./motion"

const groups = [
  {
    icon: Code2,
    title: "Source code",
    items: [
      "Full Nexora CRM source code",
      "All CRM modules included",
      "TanStack Start + React + TS",
      "Tailwind CSS integration",
    ],
  },
  {
    icon: Palette,
    title: "Design",
    items: [
      "Fully responsive layouts",
      "Dark & light mode support",
      "Reusable shadcn/ui components",
    ],
  },
  {
    icon: LifeBuoy,
    title: "License & updates",
    items: [
      "Lifetime free updates",
      "Commercial license",
      "Unlimited personal & client projects",
    ],
  },
]

export function Pricing() {
  return (
    <Section id="pricing" className="border-t py-20">
      {/* Section Heading */}
      <Reveal>
        <SectionHeading
          eyebrow="PRICING"
          title="Build faster. Pay once. Own the code."
          description="Get the complete Nexora CRM template and use it as the foundation for your next CRM, SaaS product, or internal tool."
        />
      </Reveal>

      {/* Pricing Card */}
      <Reveal variant="scaleIn" className="mx-auto mt-16 max-w-5xl">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-xs">
          <div className="grid lg:grid-cols-12">
            {/* Price Panel */}
            <Reveal
              variant="slideLeft"
              className="relative flex flex-col justify-between bg-foreground p-8 text-background sm:p-10 lg:col-span-5"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-background/5 blur-2xl"
              />

              <div className="relative">
                <span className="inline-flex rounded-full border border-background/20 px-3 py-1 text-xs font-medium text-background/70">
                  Nexora CRM · Lifetime access
                </span>

                <div className="mt-8 flex items-baseline gap-2">
                  <span className="text-6xl font-bold tracking-tight">
                    $49
                  </span>

                  <span className="text-xs font-medium uppercase text-background/60">
                    USD / one-time
                  </span>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-background/70">
                  Pay once, get lifetime updates. No recurring subscription
                  fees.
                </p>

                <Button
                  size="lg"
                  variant="secondary"
                  className="mt-8 h-12 w-full gap-2 text-sm font-semibold"
                >
                  Get Nexora Now
                  <ArrowRight className="size-4" />
                </Button>
              </div>

              <ul className="relative mt-10 space-y-3 border-t border-background/15 pt-6 text-xs text-background/70">
                <li className="flex items-center gap-2.5">
                  <Download className="size-4 shrink-0" />
                  Instant repository download
                </li>

                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="size-4 shrink-0" />
                  100% money-back guarantee
                </li>
              </ul>
            </Reveal>

            {/* Features */}
            <Reveal
              variant="slideRight"
              className="p-8 sm:p-10 lg:col-span-7"
            >
              <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Everything you need to launch immediately.
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Customize the codebase, connect your backend APIs, and ship
                your product in days.
              </p>

              {/* Feature Groups */}
              <Stagger
                delay={0.05}
                className="mt-8 grid gap-8 sm:grid-cols-2"
              >
                {groups.map((group) => {
                  const Icon = group.icon

                  return (
                    <Item key={group.title}>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-lg border bg-muted/40">
                            <Icon className="size-3.5 text-muted-foreground" />
                          </div>

                          <h4 className="text-sm font-semibold text-foreground">
                            {group.title}
                          </h4>
                        </div>

                        <ul className="mt-4 space-y-2.5">
                          {group.items.map((item) => (
                            <li
                              key={item}
                              className="flex items-start gap-2.5"
                            >
                              <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />

                              <span className="text-xs text-foreground/80">
                                {item}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Item>
                  )
                })}
              </Stagger>
            </Reveal>
          </div>
        </div>
      </Reveal>
    </Section>
  )
}