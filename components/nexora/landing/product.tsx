"use client"

import { ArrowUpRight, Check } from "lucide-react"

import { Section } from "./section"
import { SectionHeading } from "./section-heading"
import { Item, Reveal, Stagger } from "./motion"

export function Product() {
  return (
    <Section
      id="product"
      className="dark relative overflow-hidden border-t bg-background pt-16 text-foreground sm:pt-24 lg:pt-28"
    >
      {/* Background Radial Dot Pattern */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"
        aria-hidden="true"
      />

      {/* Section Heading */}
      <Reveal>
        <SectionHeading
          eyebrow="PRODUCT"
          title="Everything your team needs to manage the entire sales process."
          description="Nexora brings leads, contacts, companies, deals, activities, and analytics into one focused workspace."
        />
      </Reveal>

      <div className="relative mt-16 grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        {/* Content */}
        <Reveal variant="slideLeft">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
              <span className="size-1.5 rounded-full bg-primary" />
              ONE WORKSPACE
            </p>

            <h3 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Keep your entire customer journey connected.
            </h3>

            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Stop jumping between disconnected tools. Nexora gives your team
              one place to organize relationships, track opportunities, and keep
              every part of the sales process moving.
            </p>

            {/* Benefits */}
            <Stagger className="mt-8 space-y-4">
              <Item>
                <div className="flex gap-3">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="size-3" />
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold">
                      Manage leads and relationships
                    </h4>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Keep leads, contacts, and companies organized in one
                      place.
                    </p>
                  </div>
                </div>
              </Item>

              <Item>
                <div className="flex gap-3">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="size-3" />
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold">
                      Track your sales pipeline
                    </h4>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Move deals through every stage and know what needs
                      attention.
                    </p>
                  </div>
                </div>
              </Item>

              <Item>
                <div className="flex gap-3">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="size-3" />
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold">
                      Understand your performance
                    </h4>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Turn your CRM activity into clear sales insights and
                      reports.
                    </p>
                  </div>
                </div>
              </Item>
            </Stagger>

            {/* CTA */}
            <Reveal>
              <a
                href="#features"
                className="mt-8 inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
              >
                Explore CRM features
                <ArrowUpRight className="size-4" />
              </a>
            </Reveal>
          </div>
        </Reveal>

        {/* Product Screenshot */}
        <Reveal variant="slideRight">
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border bg-background shadow-xl ring-1 ring-foreground/5">
              {/* Browser bar */}
              <div className="flex h-10 items-center justify-between border-b bg-muted/40 px-4">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-rose-400/70" />
                  <span className="size-2.5 rounded-full bg-amber-400/70" />
                  <span className="size-2.5 rounded-full bg-emerald-400/70" />
                </div>

                <div className="mx-auto hidden h-6 w-64 items-center justify-center rounded-md border bg-background text-[11px] text-muted-foreground sm:flex">
                  app.nexora.crm/dashboard
                </div>

                <div className="w-12" />
              </div>

              {/* Screenshot */}
              <div className="overflow-hidden bg-muted/20">
                <img
                  src={`${import.meta.env.BASE_URL}screenshots/calender.png`}
                  alt="Nexora CRM dashboard"
                  className="block h-auto w-full dark:hidden"
                />

                <img
                  src={`${import.meta.env.BASE_URL}screenshots/calender-dark.png`}
                  alt=""
                  aria-hidden
                  className="hidden h-auto w-full dark:block"
                />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}