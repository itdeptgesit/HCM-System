"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react"
import { ArrowUpRight, Menu, X } from "lucide-react"
import { Link } from "@tanstack/react-router"

import { Button, buttonVariants } from "@workspace/ui/components/button"
import { ThemeToggle } from "@workspace/ui/components/theme-toggle"

import { EASE, pressable } from "./motion"

const navItems = [
  { label: "Home", href: "#home" },
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQs", href: "#faqs" },
]

const menuItem = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25, ease: EASE } },
}

// Stagger step for the CSS entrance animation (60ms each)
const step = (i: number) => ({ "--i": i }) as CSSProperties

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState("home")

  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  })

  useEffect(() => {
    const sections = navItems
      .map((item) => document.querySelector(item.href))
      .filter(Boolean) as HTMLElement[]

    const handleScroll = () => {
      const scrollTop = window.scrollY
      setScrolled(scrollTop > 20)

      if (scrollTop < 100) {
        setActiveSection("home")
        return
      }

      const position = scrollTop + 120
      let current = "home"

      for (const section of sections) {
        if (section.offsetTop <= position) current = section.id
      }

      setActiveSection(current)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleScroll)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
    }
  }, [])

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <header
      className={[
        "inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled ? "fixed" : "absolute",
        scrolled
          ? "border-b bg-background/85 shadow-sm backdrop-blur-xl"
          : "bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          to="/"
          onClick={closeMobileMenu}
          className="nav-in flex items-center gap-2"
          style={step(0)}
        >
          <div className="flex size-9 items-center justify-center rounded-xl bg-foreground text-sm font-semibold text-background shadow-sm">
            N
          </div>
          <span className="text-lg font-semibold tracking-tight">Nexora</span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="nav-in hidden items-center gap-1 rounded-full border bg-background/60 px-2 py-1.5 shadow-sm backdrop-blur-md lg:flex"
          style={step(1)}
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.href.slice(1)

            return (
              <a
                key={item.href}
                href={item.href}
                className={[
                  "relative rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  isActive
                    ? "text-background"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                ].join(" ")}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    className="absolute inset-0 rounded-full bg-foreground shadow-sm"
                  />
                )}
                <span className="relative">{item.label}</span>
              </a>
            )
          })}
        </nav>

        {/* Desktop Actions */}
        <div
          className="nav-in hidden items-center gap-2 md:flex"
          style={step(2)}
        >
          <ThemeToggle compact />

          <motion.div {...pressable}>
            <Button
              variant="outline"
              size="sm"
              className="bg-background"
              onClick={() =>
  window.open(`${import.meta.env.BASE_URL}dashboard`, "_blank")
}
            >
              Live Preview
            </Button>
          </motion.div>

          <motion.div {...pressable}>
            <Link
              to="/auth/login"
              target="_blank"
              rel="noopener noreferrer"
              className={`${buttonVariants({ size: "sm" })} gap-1.5`}
            >
              SignIn
              <ArrowUpRight className="size-4" />
            </Link>
          </motion.div>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="outline"
          size="icon"
          className="nav-in border bg-background/70 backdrop-blur-md md:hidden"
          style={step(2)}
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={mobileMenuOpen ? "close" : "open"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="inline-flex"
            >
              {mobileMenuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute inset-x-4 top-[68px] origin-top overflow-hidden rounded-2xl border bg-background/95 shadow-xl backdrop-blur-xl md:hidden"
          >
            <motion.nav
              initial="hidden"
              animate="show"
              variants={{
                show: {
                  transition: { staggerChildren: 0.04, delayChildren: 0.05 },
                },
              }}
              className="p-3"
            >
              <div className="flex flex-col">
                {navItems.map((item) => {
                  const isActive = activeSection === item.href.slice(1)

                  return (
                    <motion.a
                      key={item.href}
                      href={item.href}
                      variants={menuItem}
                      onClick={closeMobileMenu}
                      className={[
                        "rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      ].join(" ")}
                    >
                      {item.label}
                    </motion.a>
                  )
                })}
              </div>

              <motion.div
                variants={menuItem}
                className="mt-2 flex gap-2 border-t pt-3"
              >
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    window.open(`${import.meta.env.BASE_URL}dashboard`, "_blank")
                    closeMobileMenu()
                  }}
                >
                  Live Preview
                </Button>

                <Link
                  to="/auth/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMobileMenu}
                  className={`${buttonVariants({ size: "default" })} flex-1 gap-1.5`}
                >
                  SignIn
                  <ArrowUpRight className="size-4" />
                </Link>
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll Progress */}
      <motion.div
        aria-hidden
        style={{ scaleX: progress }}
        className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-primary"
      />
    </header>
  )
}