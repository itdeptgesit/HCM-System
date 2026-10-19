import { useState, type FormEvent } from "react"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Laptop,
  LogOut,
  Monitor,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

interface Session {
  id: number
  device: string
  browser: string
  location: string
  lastActive: string
  current: boolean
  type: "desktop" | "laptop" | "mobile"
}

const initialSessions: Session[] = [
  {
    id: 1,
    device: "Windows PC",
    browser: "Chrome on Windows",
    location: "Ghaziabad, India",
    lastActive: "Active now",
    current: true,
    type: "desktop",
  },
  {
    id: 2,
    device: "MacBook Pro",
    browser: "Safari on macOS",
    location: "New Delhi, India",
    lastActive: "2 hours ago",
    current: false,
    type: "laptop",
  },
  {
    id: 3,
    device: "iPhone 15",
    browser: "Safari on iOS",
    location: "New Delhi, India",
    lastActive: "Yesterday",
    current: false,
    type: "mobile",
  },
]

export function SecuritySettings() {
  // Password States
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: "success" | "error" | "info"
    text: string
  } | null>(null)

  // 2FA States
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  // Sessions States
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [confirmSignOutAll, setConfirmSignOutAll] = useState(false)
  const [sessionFeedback, setSessionFeedback] = useState<string | null>(null)

  // Calculate basic password strength score (0-4)
  const calculateStrength = (pwd: string) => {
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    return score
  }

  const passwordStrength = calculateStrength(newPassword)

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const confirmPassword = String(formData.get("confirmPassword") ?? "")

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: "error",
        text: "New password and confirmation do not match.",
      })
      return
    }

    setPasswordFeedback({
      type: "info",
      text: "Demo mode: connect authentication to securely update your password.",
    })
    event.currentTarget.reset()
    setNewPassword("")
  }

  function handleSignOut(sessionId: number) {
    setSessions((current) => current.filter((s) => s.id !== sessionId))
    setSessionFeedback("Session signed out successfully.")
    setTimeout(() => setSessionFeedback(null), 3000)
  }

  function handleSignOutAll() {
    setSessions((current) => current.filter((s) => s.current))
    setConfirmSignOutAll(false)
    setSessionFeedback("All other devices signed out.")
    setTimeout(() => setSessionFeedback(null), 3000)
  }

  return (
    <div className="mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Security & Privacy</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account password, multi-factor authentication, and active sessions.
        </p>
      </div>

      <div className="space-y-6">
        {/* Section 1: Password Management */}
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs">
          <div className="flex items-center gap-3 border-b p-5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Change password</h3>
              <p className="text-xs text-muted-foreground">
                Update your password regularly to keep your account safe
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  name="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* New Password */}
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="space-y-1 pt-1">
                    <div className="flex h-1.5 gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full flex-1 rounded-full transition-colors ${
                            step <= passwordStrength
                              ? passwordStrength <= 2
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                              : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Strength:{" "}
                      <span className="font-medium text-foreground">
                        {passwordStrength <= 1
                          ? "Weak"
                          : passwordStrength <= 3
                            ? "Moderate"
                            : "Strong"}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            {passwordFeedback && (
              <div
                className={`flex items-center gap-2 rounded-lg p-3 text-xs ${
                  passwordFeedback.type === "error"
                    ? "bg-destructive/10 text-destructive"
                    : passwordFeedback.type === "success"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {passwordFeedback.type === "error" ? (
                  <XCircle className="size-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="size-4 shrink-0" />
                )}
                <span>{passwordFeedback.text}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm">
                Update password
              </Button>
            </div>
          </form>
        </section>

        {/* Section 2: Two-Factor Authentication */}
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                  twoFactorEnabled
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {twoFactorEnabled ? (
                  <ShieldCheck className="size-5" />
                ) : (
                  <ShieldAlert className="size-5" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Two-factor authentication</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      twoFactorEnabled
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {twoFactorEnabled ? "Active" : "Recommended"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground max-w-xl">
                  Add an extra layer of defense by requiring an authentication code in addition
                  to your main password during login.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant={twoFactorEnabled ? "outline" : "default"}
              size="sm"
              onClick={() => setTwoFactorEnabled((prev) => !prev)}
              className="shrink-0"
            >
              {twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
            </Button>
          </div>
        </section>

        {/* Section 3: Active Sessions */}
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h3 className="text-sm font-semibold">Active sessions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Devices currently signed into your account.
              </p>
            </div>

            {sessions.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmSignOutAll(true)}
              >
                <LogOut className="mr-2 size-3.5" />
                Sign out other devices
              </Button>
            )}
          </div>

          {sessionFeedback && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400">
              <Check className="size-4 shrink-0" />
              <span>{sessionFeedback}</span>
            </div>
          )}

          {confirmSignOutAll && (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3.5">
              <div className="flex items-center gap-2.5 text-xs text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Sign out all devices except this current session?</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setConfirmSignOutAll(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleSignOutAll}
                >
                  Confirm
                </Button>
              </div>
            </div>
          )}

          <div className="divide-y">
            {sessions.map((session) => {
              const DeviceIcon =
                session.type === "mobile"
                  ? Smartphone
                  : session.type === "laptop"
                    ? Laptop
                    : Monitor

              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                      <DeviceIcon className="size-4 text-muted-foreground" />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold truncate">{session.device}</p>
                        {session.current && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            Current session
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {session.browser} • {session.location}
                      </p>
                      <p className="text-[10px] text-muted-foreground/80">
                        {session.lastActive}
                      </p>
                    </div>
                  </div>

                  {!session.current && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => handleSignOut(session.id)}
                    >
                      Sign out
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}