import { useState, useRef, type FormEvent, type ChangeEvent } from "react"
import {
  Briefcase,
  Building2,
  Camera,
  Check,
  Globe,
  Globe2,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Sparkles,
  Trash2,
  User,
} from "lucide-react"


import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { SocialProfilesSection } from "./social-profiles-section"

export function ProfileSettings() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
  "https://untitledui.com/images/avatars/aliah-lane"
)
  const [isSaved, setIsSaved] = useState(false)
  const [message, setMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setAvatarUrl(url)
      setMessage("Avatar uploaded successfully!")
      setIsSaved(false)
    }
  }

  function handleRemoveAvatar() {
    setAvatarUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    setMessage("Avatar removed.")
    setIsSaved(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaved(true)
    setMessage("Demo mode: backend changes simulated successfully!")
  }
  

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header Banner & Overview */}
      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-xs">
        {/* Decorative Top Accent Banner */}
        <div className="h-28 bg-gradient-to-r from-primary/10 via-primary/5 to-muted/20 border-b" />

        <div className="px-6 pb-6 pt-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between -mt-12">
            {/* Avatar & User Details */}
            <div className="flex items-end gap-4">
              <div className="relative group">
                <div className="relative flex size-24 shrink-0 items-center justify-center rounded-2xl border-4 border-card bg-muted text-xl font-semibold shadow-md overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile preview"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground">AM</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 flex size-7 items-center justify-center rounded-full border bg-background shadow-xs transition-transform hover:scale-105"
                  title="Change photo"
                >
                  <Camera className="size-3.5 text-muted-foreground" />
                </button>
              </div>

              <div className="mb-1 space-y-0.5">
                <h2 className="text-xl font-bold tracking-tight">Alex Morgan</h2>
                <p className="text-xs text-muted-foreground">Sales Manager • Nexora CRM</p>
              </div>
            </div>

            {/* Quick Badges/Actions */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Active Account
              </span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Grid Layout */}
        <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            {/* Section 1: Personal Information */}
            <section className="rounded-xl border bg-card p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-semibold">Personal details</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update your personal info, job details, and contact details.
                </p>
              </div>

              {/* Avatar Uploader Section */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-muted/20 p-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium">Profile photo</p>
                  <p className="text-[11px] text-muted-foreground">
                    Supports JPG, PNG or WebP up to 2MB.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5 text-xs"
                  >
                    <Camera className="size-3.5" />
                    Upload new
                  </Button>

                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      className="text-destructive hover:text-destructive text-xs gap-1"
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              {/* Form Input Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full-name" className="text-xs font-medium">
                    Full name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="full-name"
                      name="fullName"
                      defaultValue="Alex Morgan"
                      placeholder="Enter your full name"
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="job-title" className="text-xs font-medium">
                    Job title
                  </Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="job-title"
                      name="jobTitle"
                      defaultValue="Sales Manager"
                      placeholder="Enter your job title"
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-email" className="text-xs font-medium">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="profile-email"
                      name="email"
                      type="email"
                      defaultValue="alex@nexora.dev"
                      placeholder="Enter your email"
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-medium">
                    Phone number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      defaultValue="+1 (555) 000-0000"
                      placeholder="Enter phone number"
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-xs font-medium">
                    Department
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="department"
                      name="department"
                      defaultValue="Sales & Business Development"
                      placeholder="Enter department"
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-xs font-medium">
                    Location / Office
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="location"
                      name="location"
                      defaultValue="San Francisco, CA"
                      placeholder="Enter office location"
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Bio / Summary */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-xs font-medium">
                  Bio / Summary
                </Label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  defaultValue="Leading the enterprise sales team at Nexora. Passionate about CRM workflows and high-converting customer pipelines."
                  placeholder="Write a short summary about yourself..."
                  className="w-full rounded-md border border-input bg-background p-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </section>

            {/* Section 2: Regional Preferences */}
            <section className="rounded-xl border bg-card p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-semibold">Regional & Locale Preferences</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tailor your date formats, time zones, and language options.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-xs font-medium">
                    Time zone
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <select
                      id="timezone"
                      name="timezone"
                      defaultValue="Asia/Kolkata"
                      className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (GMT +05:30)</option>
                      <option value="America/New_York">America/New York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language" className="text-xs font-medium">
                    Language
                  </Label>
                  <div className="relative">
                    <Globe2 className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <select
                      id="language"
                      name="language"
                      defaultValue="English (US)"
                      className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="English (US)">English (US)</option>
                      <option value="English (UK)">English (UK)</option>
                      <option value="Spanish">Spanish (Español)</option>
                      <option value="French">French (Français)</option>
                      <option value="German">German (Deutsch)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat" className="text-xs font-medium">
                    Date format
                  </Label>
                  <select
                    id="dateFormat"
                    name="dateFormat"
                    defaultValue="DD/MM/YYYY"
                    className="w-full rounded-md border border-input bg-background py-2 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2026)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firstDay" className="text-xs font-medium">
                    First day of week
                  </Label>
                  <select
                    id="firstDay"
                    name="firstDay"
                    defaultValue="Monday"
                    className="w-full rounded-md border border-input bg-background py-2 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Sunday">Sunday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar Area */}
          <aside className="space-y-6">
            {/* Social Links Panel */}
            <SocialProfilesSection/>

            {/* Quick Tips Box */}
            <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-500" />
                Profile visibility
              </p>
              <p className="leading-relaxed">
                Your profile information is visible to other members inside your Nexora workspace. Email address is kept private except to admins.
              </p>
            </div>
          </aside>
        </div>

        {/* Floating/Bottom Action Bar */}
        <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-xl border bg-card/95 px-5 py-3.5 shadow-lg backdrop-blur-xs">
          <div className="text-xs text-muted-foreground">
            {message ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <Sparkles className="size-3.5 text-amber-500" />
                {message}
              </span>
            ) : (
              <span>Changes made to your profile will automatically save upon clicking.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMessage("Reset changes.")}
              className="gap-1 text-xs"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
            <Button type="submit" size="sm" className="gap-1.5 text-xs">
              {isSaved && <Check className="size-4" />}
              {isSaved ? "Saved" : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}