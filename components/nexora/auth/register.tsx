import { useState, type FormEvent } from "react"
import { Link } from "@tanstack/react-router"
import { AnimatePresence, motion } from "motion/react"
import { Check, Eye, EyeOff, GalleryVerticalEnd } from "lucide-react"
import { FaGithub } from "react-icons/fa6"
import { FcGoogle } from "react-icons/fc"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { pressable, step } from "../landing/motion"

const LOGOS = ["google", "slack", "openai", "claude"]
const BENEFITS = [
  "Unlimited leads, contacts and companies",
  "Visual deal pipeline with forecasting",
  "Reports your whole team can trust",
  "Free for 14 days, no credit card needed",
]
const SOCIALS = [
  { name: "Google", icon: FcGoogle },
  { name: "GitHub", icon: FaGithub },
]
const FOOTER_LINKS = ["Documentation", "Support", "Privacy"]
const STRENGTH = [
  { label: "Too weak", color: "bg-rose-500" },
  { label: "Weak", color: "bg-rose-500" },
  { label: "Fair", color: "bg-amber-500" },
  { label: "Good", color: "bg-blue-500" },
  { label: "Strong", color: "bg-emerald-500" },
]
const linkClass =
  "font-medium text-foreground underline underline-offset-4 hover:text-primary"

const getScore = (p: string) =>
  [
    p.length >= 8,
    /[a-z]/.test(p) && /[A-Z]/.test(p),
    /\d/.test(p),
    /[^A-Za-z0-9]/.test(p),
  ].filter(Boolean).length

export function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")

  const strength = STRENGTH[getScore(password)]
  const score = Math.max(getScore(password), 1)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage("Registration is not connected yet.")
  }

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background">
      {/* Dot pattern */}
      <div className="pointer-events-none absolute inset-0 text-neutral-400/70 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(700px_circle_at_center,white,transparent)]" />

      <header className="relative z-20 flex h-20 items-center justify-between px-6 lg:px-12">
        <Link
          to="/"
          className="hero-in flex items-center gap-2 text-sm font-semibold"
          style={step(0)}
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
            <GalleryVerticalEnd className="size-4" />
          </div>
          Nexora
        </Link>
        <p className="hero-in text-sm text-muted-foreground" style={step(1)}>
          Already have an account?{" "}
          <Link to="/auth/login" className={linkClass}>
            Sign in
          </Link>
        </p>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-8">
        <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1fr_380px] lg:gap-16">
          <section className="hidden lg:block">
            <div
              className="hero-in mb-5 inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm"
              style={step(1)}
            >
              <span className="size-1.5 rounded-full bg-primary" />
              14-day free trial
            </div>
            <h1
              className="hero-in max-w-xl text-4xl font-semibold tracking-tight xl:text-5xl"
              style={step(2)}
            >
              Start closing <span className="text-primary">deals faster.</span>
            </h1>
            <p
              className="hero-in mt-6 max-w-lg text-base leading-7 text-muted-foreground"
              style={step(3)}
            >
              Create your Nexora CRM account and get your whole sales team on
              one pipeline in minutes.
            </p>
            <ul className="mt-8 grid gap-4">
              {BENEFITS.map((benefit, i) => (
                <li
                  key={benefit}
                  className="hero-in flex items-center gap-3 text-sm"
                  style={step(i + 4)}
                >
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="size-3" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>

            <div className="hero-in" style={step(8)}>
              <p className="mb-5 mt-12 text-sm font-medium text-muted-foreground">
                Trusted by leading teams
              </p>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 opacity-80 dark:opacity-100">
                {LOGOS.map((logo) => (
                  <img
                    key={logo}
                    src={`https://store.codervent.com/logos/${logo}.svg`}
                    alt={logo}
                    className={`${logo === "google" ? "h-6" : "h-5"} w-auto object-contain grayscale dark:brightness-0 dark:invert`}
                  />
                ))}
              </div>
            </div>
          </section>

          <div
            className="hero-in w-full rounded-2xl border bg-background/90 p-7 shadow-xl backdrop-blur-md sm:p-8"
            style={step(2)}
          >
            <h2 className="text-xl font-semibold tracking-tight">
              Create your account
            </h2>
            <p className="mb-7 mt-1.5 text-sm text-muted-foreground">
              Start your 14-day free trial. No credit card required.
            </p>

            <div className="grid gap-3">
              {SOCIALS.map(({ name, icon: Icon }) => (
                <motion.div key={name} {...pressable}>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      setMessage(`${name} sign-up is not configured yet.`)
                    }
                  >
                    <Icon className="size-4" />
                    Continue with {name}
                  </Button>
                </motion.div>
              ))}
            </div>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              OR
              <div className="h-px flex-1 bg-border" />
            </div>

            <form
              className="grid gap-5"
              onSubmit={handleSubmit}
              onChange={() => setMessage("")}
            >
              <div className="grid gap-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  placeholder="Alex Morgan"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    className="pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={showPassword ? "hide" : "show"}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.12 }}
                        className="flex"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </motion.span>
                    </AnimatePresence>
                  </button>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  {password ? (
                    <motion.div
                      key="meter"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-3"
                    >
                      <div className="flex flex-1 gap-1.5">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= score ? strength.color : "bg-muted"}`}
                          />
                        ))}
                      </div>
                      <span className="w-14 text-right text-xs font-medium text-muted-foreground">
                        {strength.label}
                      </span>
                    </motion.div>
                  ) : (
                    <motion.p
                      key="hint"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="text-xs text-muted-foreground"
                    >
                      Use 8+ characters with letters, numbers and a symbol.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
                <input
                  type="checkbox"
                  required
                  className="mt-0.5 size-4 accent-primary"
                />
                <span>
                  I agree to the{" "}
                  <a
                    href="#"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="#"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>

              <motion.div {...pressable}>
                <Button type="submit" className="w-full">
                  Create account
                </Button>
              </motion.div>

              <AnimatePresence>
                {message && (
                  <motion.p
                    key={message}
                    role="status"
                    aria-live="polite"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="text-center text-sm text-muted-foreground"
                  >
                    {message}
                  </motion.p>
                )}
              </AnimatePresence>
            </form>
          </div>
        </div>
      </main>

      <footer
        className="hero-in relative z-20 flex flex-col items-center justify-between gap-4 px-6 pb-6 pt-4 text-xs text-muted-foreground sm:flex-row sm:px-10 lg:px-12"
        style={step(9)}
      >
        <p>
          Developed by{" "}
          <a
            href="https://codervent.com/"
            className="font-medium text-foreground transition-colors hover:text-primary"
          >
            Codervent
          </a>
        </p>
        <nav className="flex items-center gap-5">
          {FOOTER_LINKS.map((item) => (
            <a
              key={item}
              href="#"
              className="transition-colors hover:text-foreground"
            >
              {item}
            </a>
          ))}
        </nav>
      </footer>
    </div>
  )
}