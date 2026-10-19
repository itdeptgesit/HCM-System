"use client"

import * as React from "react"
import {
  FaDiscord,
  FaFigma,
  FaGithub,
  FaLinkedin,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa"
import { ArrowUp, Check, Send } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { Item, Reveal, Stagger } from "./motion"

const footerNavigation = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "#product" },
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Testimonials", href: "#testimonials" },
      { label: "FAQs", href: "#faqs" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#privacy" },
      { label: "Terms of Service", href: "#terms" },
      { label: "License Agreement", href: "#license" },
    ],
  },
]

const socialLinks = [
  { icon: FaGithub, label: "GitHub", href: "https://github.com" },
  { icon: FaTwitter, label: "Twitter", href: "https://twitter.com" },
  { icon: FaLinkedin, label: "LinkedIn", href: "https://linkedin.com" },
  { icon: FaDiscord, label: "Discord", href: "https://discord.com" },
  { icon: FaYoutube, label: "YouTube", href: "https://youtube.com" },
  { icon: FaFigma, label: "Figma", href: "https://figma.com" },
]

export function Footer() {
  const [subscribed, setSubscribed] = React.useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubscribed(true)
  }

  return (
    <footer className="relative overflow-hidden border-t bg-background">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Newsletter */}
        <Reveal variant="scaleIn">
          <div className="relative -mt-px overflow-hidden rounded-b-3xl bg-foreground px-8 py-10 text-background sm:px-12 sm:py-12">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-background/5 blur-3xl"
            />

            <div className="relative grid gap-8 lg:grid-cols-12 lg:items-center">
              <Reveal
                variant="slideLeft"
                className="lg:col-span-7"
              >
                <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Stay updated with Nexora releases.
                </h3>

                <p className="mt-3 max-w-xl text-sm leading-relaxed text-background/70">
                  Product updates, UI improvements, and new feature releases
                  delivered to your inbox. No spam.
                </p>
              </Reveal>

              <Reveal
                variant="slideRight"
                className="lg:col-span-5"
              >
                {subscribed ? (
                  <div className="flex h-11 items-center gap-2 text-sm font-medium">
                    <span className="flex size-6 items-center justify-center rounded-full bg-background text-foreground">
                      <Check className="size-3.5" />
                    </span>

                    Thanks, you're on the list.
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="flex gap-2"
                  >
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="Enter your email"
                      aria-label="Email address"
                      className="h-11 w-full rounded-xl border border-background/20 bg-background/10 px-4 text-sm text-background placeholder:text-background/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/40"
                    />

                    <Button
                      type="submit"
                      variant="secondary"
                      className="h-11 shrink-0 gap-1.5 px-5"
                    >
                      Subscribe
                      <Send className="size-3.5" />
                    </Button>
                  </form>
                )}
              </Reveal>
            </div>
          </div>
        </Reveal>

        {/* Main */}
        <div className="grid gap-12 py-14 lg:grid-cols-12 lg:py-16">
          {/* Brand */}
          <Reveal
            variant="slideLeft"
            className="lg:col-span-5"
          >
            <a
              href="/"
              className="inline-flex items-center gap-2.5"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                N
              </span>

              <span className="text-lg font-bold tracking-tight">
                Nexora
              </span>
            </a>

            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              A modern CRM foundation for developers building SaaS products,
              internal tools, and customer-focused software.
            </p>

            {/* Social Links */}
            <Stagger
              delay={0.05}
              className="mt-6 flex flex-wrap gap-1.5"
            >
              {socialLinks.map(({ icon: Icon, label, href }) => (
                <Item key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="flex size-9 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-all hover:border-foreground/30 hover:text-foreground active:scale-95"
                  >
                    <Icon className="size-4" />
                  </a>
                </Item>
              ))}
            </Stagger>
          </Reveal>

          {/* Navigation */}
          <Stagger
            delay={0.05}
            className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7 lg:pl-8"
          >
            {footerNavigation.map((group) => (
              <Item key={group.title}>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    {group.title}
                  </h4>

                  <ul className="mt-5 space-y-3">
                    {group.links.map((link) => (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </Item>
            ))}
          </Stagger>
        </div>

        {/* Bottom Bar */}
        <Reveal>
          <div className="flex flex-col gap-4 border-t py-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Nexora. All rights reserved.
            </p>

            <div className="flex items-center gap-4">
              <p className="text-xs text-muted-foreground">
                Built with TanStack Start & shadcn/ui
              </p>

              <button
                type="button"
                onClick={() =>
                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  })
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-95"
              >
                Back to top
                <ArrowUp className="size-3.5" />
              </button>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Wordmark */}
      <Reveal
        variant="fadeIn"
        className="pointer-events-none -mb-[0.18em] select-none text-center text-[22vw] font-bold leading-none tracking-tighter text-transparent lg:text-[240px]"
      >
        <span className="bg-gradient-to-b from-foreground/15 to-transparent bg-clip-text">
          Nexora
        </span>
      </Reveal>
    </footer>
  )
}