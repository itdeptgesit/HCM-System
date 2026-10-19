import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { AnimatePresence, motion } from "motion/react"
import { Eye, EyeOff, GalleryVerticalEnd, LockKeyhole } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { pressable, step } from "../landing/motion"

const LOGOS = ["google", "slack", "openai", "claude"]
const FOOTER_LINKS = ["Documentation", "Support", "Privacy"]
const STRENGTH = [
  { label: "Too weak", color: "bg-rose-500" },
  { label: "Weak", color: "bg-rose-500" },
  { label: "Fair", color: "bg-amber-500" },
  { label: "Good", color: "bg-blue-500" },
  { label: "Strong", color: "bg-emerald-500" },
]

const getScore = (p: string) =>
  [
    p.length >= 8,
    /[a-z]/.test(p) && /[A-Z]/.test(p),
    /\d/.test(p),
    /[^A-Za-z0-9]/.test(p),
  ].filter(Boolean).length

export function ResetPassword() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")

  const score = getScore(password)
  const strength = STRENGTH[score]

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (score < 3)
      return setError(
        "Choose a stronger password: 8+ characters, mixed case and a number."
      )
    if (password !== confirm) return setError("Passwords don't match.")
    navigate({ to: "/auth/password-success" })
  }

  // One toggle controls both password fields
  const eye = (
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
  )

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
          Remembered your password?{" "}
          <Link
            to="/auth/login"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
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
              Secure your account
            </div>
            <h1
              className="hero-in max-w-xl text-4xl font-semibold tracking-tight xl:text-5xl"
              style={step(2)}
            >
              Choose a <span className="text-primary">new password.</span>
            </h1>
            <p
              className="hero-in mt-6 max-w-lg text-base leading-7 text-muted-foreground"
              style={step(3)}
            >
              Pick a strong password you haven't used before. It takes effect
              straight away, and you'll be back in your pipeline in a moment.
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
            <div className="mb-6 flex size-12 items-center justify-center rounded-xl border bg-muted/50">
              <LockKeyhole className="size-5" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              Set a new password
            </h2>
            <p className="mb-7 mt-1.5 text-sm text-muted-foreground">
              Your new password must be different from the one you used before.
            </p>

            <form className="grid gap-5" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a new password"
                    autoComplete="new-password"
                    className="pr-10"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError("")
                    }}
                    minLength={8}
                    required
                  />
                  {eye}
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
                            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= Math.max(score, 1) ? strength.color : "bg-muted"}`}
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

              <div className="grid gap-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className="pr-10"
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value)
                      setError("")
                    }}
                    required
                  />
                  {eye}
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    key={error}
                    role="alert"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-destructive"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.div {...pressable}>
                <Button type="submit" className="w-full">
                  Reset password
                </Button>
              </motion.div>
            </form>
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