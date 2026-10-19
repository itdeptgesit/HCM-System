"use client"

import { Quote, Star } from "lucide-react"

import { Section } from "./section"
import { SectionHeading } from "./section-heading"
import { Item, Reveal, Stagger } from "./motion"

const testimonials = [
  {
    quote:
      "Nexora gives you a strong starting point for building a CRM without spending weeks creating the UI from scratch.",
    name: "Alex Rivera",
    role: "SaaS Builder",
    initials: "AR",
    tag: "Design System",
  },
  {
    quote:
      "The combination of TanStack Start, TypeScript, Tailwind, and shadcn/ui makes the project easy to understand and customize.",
    name: "Elena Rostova",
    role: "Frontend Developer",
    initials: "ER",
    tag: "Tech Stack",
  },
  {
    quote:
      "Having leads, deals, contacts, activities, reports, and team management already designed makes it much easier to focus on the actual product.",
    name: "Marcus Vance",
    role: "Startup Founder",
    initials: "MV",
    tag: "Productivity",
  },
  {
    quote:
      "The layout responsiveness and dark mode integration saved us weeks of design fine-tuning.",
    name: "Sarah Chen",
    role: "Product Designer",
    initials: "SC",
    tag: "UI Quality",
  },
]

const stats = [
  { value: "10+", label: "CRM modules" },
  { value: "100+", label: "Reusable UI patterns" },
  { value: "100%", label: "TypeScript ready" },
]

export function Testimonials() {
  const [featured, ...rest] = testimonials

  return (
    <Section id="testimonials" className="border-t py-20">
      {/* Section Heading */}
      <Reveal>
        <SectionHeading
          eyebrow="TESTIMONIALS"
          title="A better starting point for your next CRM."
          description="Nexora is designed to help developers move from an empty project to a polished CRM experience much faster."
        />
      </Reveal>

      {/* Testimonials */}
      <div className="mt-16 grid gap-4 lg:grid-cols-5">
        {/* Featured Testimonial */}
        <Reveal
          variant="slideLeft"
          className="lg:col-span-3"
        >
          <figure className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border bg-foreground p-8 text-background sm:p-10">
            <Quote className="absolute right-6 top-6 size-24 text-background/5" />

            <div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="size-4 fill-current"
                    />
                  ))}
                </div>

                <span className="rounded-full border border-background/20 px-3 py-1 text-xs font-medium text-background/70">
                  {featured.tag}
                </span>
              </div>

              <blockquote className="mt-8 text-xl font-medium leading-relaxed tracking-tight sm:text-2xl">
                “{featured.quote}”
              </blockquote>
            </div>

            <figcaption className="mt-10 flex items-center gap-3 border-t border-background/15 pt-6">
              <div className="flex size-10 items-center justify-center rounded-full bg-background text-xs font-bold text-foreground">
                {featured.initials}
              </div>

              <div>
                <div className="text-sm font-semibold">
                  {featured.name}
                </div>

                <div className="text-xs text-background/60">
                  {featured.role}
                </div>
              </div>
            </figcaption>
          </figure>
        </Reveal>

        {/* Supporting Testimonials */}
        <Stagger
          delay={0.05}
          className="grid gap-4 lg:col-span-2"
        >
          {rest.map((t) => (
            <Item key={t.name}>
              <figure className="flex h-full flex-col justify-between rounded-2xl border bg-card p-6 shadow-xs transition-colors hover:bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="size-3 fill-current"
                      />
                    ))}
                  </div>

                  <span className="text-xs text-muted-foreground">
                    {t.tag}
                  </span>
                </div>

                <blockquote className="mt-4 text-sm leading-relaxed text-foreground">
                  “{t.quote}”
                </blockquote>

                <figcaption className="mt-5 flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                    {t.initials}
                  </div>

                  <div className="leading-tight">
                    <div className="text-xs font-semibold text-foreground">
                      {t.name}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {t.role}
                    </div>
                  </div>
                </figcaption>
              </figure>
            </Item>
          ))}
        </Stagger>
      </div>

      {/* Stats */}
      <Stagger
        delay={0.05}
        className="mt-4 grid divide-y overflow-hidden rounded-2xl border bg-muted/20 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
      >
        {stats.map((stat) => (
          <Item key={stat.label}>
            <div className="flex h-full flex-col items-center justify-center px-6 py-6 text-center">
              <dd className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {stat.value}
              </dd>

              <dt className="mt-1 text-xs text-muted-foreground">
                {stat.label}
              </dt>
            </div>
          </Item>
        ))}
      </Stagger>
    </Section>
  )
}