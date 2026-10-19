import { useState, type FormEvent } from "react"
import { Link } from "@tanstack/react-router"
import { AnimatePresence, motion } from "motion/react"
import { Eye, EyeOff, GalleryVerticalEnd } from "lucide-react"
import { FaGithub } from "react-icons/fa6"
import { FcGoogle } from "react-icons/fc"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { pressable, step } from "../landing/motion"

const LOGOS = ["google", "slack", "openai", "claude"]
const SOCIALS = [
  { name: "Google", icon: FcGoogle },
  { name: "GitHub", icon: FaGithub },
]
const FOOTER_LINKS = ["Documentation", "Support", "Privacy"]
const legalLink = "underline underline-offset-2 hover:text-foreground"

export function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState("")

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage("Authentication is not connected yet.")
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
          Don't have an account?{" "}
          <Link
            to="/auth/register"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Create account
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
              Built for modern web applications
            </div>
            <h1
              className="hero-in max-w-xl text-4xl font-semibold tracking-tight xl:text-5xl"
              style={step(2)}
            >
              Manage your business <span className="text-primary">smarter.</span>
            </h1>
            <p
              className="hero-in mt-6 max-w-lg text-base leading-7 text-muted-foreground"
              style={step(3)}
            >
              Welcome to Nexora CRM. Manage your leads, track deals, organize
              activities, and collaborate with your team in one place.
            </p>

            <div className="hero-in" style={step(5)}>
              <p className="mb-5 mt-16 text-sm font-medium text-muted-foreground">
                Trusted by leading teams
              </p>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 opacity-80 dark:opacity-100">
                {LOGOS.map((logo) => (
                  <img
                    key={logo}
                    src={`https://store.codervent.com/logos/${logo}.svg`}
                    alt={logo}
                    className="h-5 w-auto object-contain grayscale dark:brightness-0 dark:invert"
                  />
                ))}
              </div>
            </div>
          </section>

          <div
            className="hero-in w-full rounded-2xl border bg-background/90 p-7 shadow-xl backdrop-blur-md sm:p-8"
            style={step(2)}
          >
            <h2 className="text-xl font-semibold tracking-tight">Welcome back</h2>
            <p className="mb-7 mt-1.5 text-sm text-muted-foreground">
              Sign in to your Nexora CRM account.
            </p>

            <div className="grid gap-3">
              {SOCIALS.map(({ name, icon: Icon }) => (
                <motion.div key={name} {...pressable}>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      setMessage(`${name} sign-in is not configured yet.`)
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
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/auth/forgot-password"
                    className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="pr-10"
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
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters.
                </p>
              </div>

              <motion.div {...pressable}>
                <Button type="submit" className="w-full">
                  Sign in
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

            <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
              By signing in, you agree to our{" "}
              <a href="#" className={legalLink}>Terms</a> and{" "}
              <a href="#" className={legalLink}>Privacy Policy</a>.
            </p>
          </div>
        </div>
      </main>

      <footer
        className="hero-in relative z-20 flex flex-col items-center justify-between gap-4 px-6 pb-6 pt-4 text-xs text-muted-foreground sm:flex-row sm:px-10 lg:px-12"
        style={step(6)}
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