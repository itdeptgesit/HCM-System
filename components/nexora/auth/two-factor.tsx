import { useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react"
import { Link } from "@tanstack/react-router"
import { AnimatePresence, motion } from "motion/react"
import { GalleryVerticalEnd, ShieldCheck } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { pressable, step } from "../landing/motion"

const LENGTH = 6
const LOGOS = ["google", "slack", "openai", "claude"]
const FOOTER_LINKS = ["Documentation", "Support", "Privacy"]

export function TwoFactor() {
  const [code, setCode] = useState<string[]>(Array(LENGTH).fill(""))
  const [message, setMessage] = useState("")
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const complete = code.every(Boolean)

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1)
    setCode((current) => current.map((d, i) => (i === index ? digit : d)))
    setMessage("")
    if (digit && index < LENGTH - 1) inputs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0)
      inputs.current[index - 1]?.focus()
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, LENGTH)
    if (!digits) return
    e.preventDefault()
    setCode(Array.from({ length: LENGTH }, (_, i) => digits[i] ?? ""))
    inputs.current[Math.min(digits.length, LENGTH - 1)]?.focus()
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage("Verification is not connected yet.")
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
          Wrong account?{" "}
          <Link
            to="/auth/login"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Sign in again
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
              Extra security
            </div>
            <h1
              className="hero-in max-w-xl text-4xl font-semibold tracking-tight xl:text-5xl"
              style={step(2)}
            >
              Confirm it's <span className="text-primary">really you.</span>
            </h1>
            <p
              className="hero-in mt-6 max-w-lg text-base leading-7 text-muted-foreground"
              style={step(3)}
            >
              Two-factor authentication keeps your pipeline, contacts and
              deals safe, even if your password is ever compromised.
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
              <ShieldCheck className="size-5" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              Two-factor authentication
            </h2>
            <p className="mb-7 mt-1.5 text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app to continue.
            </p>

            <form className="grid gap-5" onSubmit={handleSubmit}>
              <div className="flex justify-between gap-2">
                {code.map((digit, i) => (
                  <motion.input
                    key={i}
                    ref={(el) => {
                      inputs.current[i] = el
                    }}
                    value={digit}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    maxLength={1}
                    aria-label={`Digit ${i + 1}`}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    animate={{ scale: digit ? [1, 1.08, 1] : 1 }}
                    transition={{ duration: 0.18 }}
                    className="size-11 rounded-md border border-input bg-transparent text-center text-lg font-semibold shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                  />
                ))}
              </div>

              <motion.div {...(complete ? pressable : {})}>
                <Button type="submit" className="w-full" disabled={!complete}>
                  Verify
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
              Can't access your app?{" "}
              <button
                type="button"
                onClick={() => setMessage("Backup codes are not configured yet.")}
                className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
              >
                Use a backup code
              </button>
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