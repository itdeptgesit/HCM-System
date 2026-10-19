import { Link, useNavigate } from "@tanstack/react-router"
import { motion } from "motion/react"
import { CheckCircle2, GalleryVerticalEnd } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { pressable, step } from "../landing/motion"

const LOGOS = ["google", "slack", "openai", "claude"]
const FOOTER_LINKS = ["Documentation", "Support", "Privacy"]

export function PasswordSuccess() {
  const navigate = useNavigate()

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
          Ready to continue?{" "}
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
              <span className="size-1.5 rounded-full bg-emerald-500" />
              All done
            </div>
            <h1
              className="hero-in max-w-xl text-4xl font-semibold tracking-tight xl:text-5xl"
              style={step(2)}
            >
              Your password is <span className="text-primary">all set.</span>
            </h1>
            <p
              className="hero-in mt-6 max-w-lg text-base leading-7 text-muted-foreground"
              style={step(3)}
            >
              Your account is secure again. Sign in with your new password to
              get back to your leads, deals and team.
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
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                bounce: 0.5,
                duration: 0.6,
                delay: 0.35,
              }}
              className="mb-6 flex size-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="size-5" />
            </motion.div>

            <h2 className="text-xl font-semibold tracking-tight">
              Password updated
            </h2>
            <p className="mb-7 mt-1.5 text-sm text-muted-foreground">
              Your password has been changed successfully. You can now sign in
              with your new password.
            </p>

            <motion.div {...pressable}>
              <Button
                className="w-full"
                onClick={() => navigate({ to: "/auth/login" })}
              >
                Continue to sign in
              </Button>
            </motion.div>

            <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
              Didn't make this change?{" "}
              <a
                href="#"
                className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
              >
                Contact support
              </a>
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