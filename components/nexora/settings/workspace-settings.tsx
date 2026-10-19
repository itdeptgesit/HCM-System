import { useState, useRef, type FormEvent, type ChangeEvent } from "react"
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Globe,
  Info,
  Landmark,
  RotateCcw,
  Upload,
} from "lucide-react"
import { FcGoogle } from "react-icons/fc"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function WorkspaceSettings() {
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoName, setLogoName] = useState<string>("Google Logo (Default)")
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "info"
    text: string
  } | null>(null)

  // Form field state for controlled Select components
  const [industry, setIndustry] = useState("Software & Technology")
  const [currency, setCurrency] = useState("USD")
  const [dateFormat, setDateFormat] = useState("MMM DD, YYYY")
  const [timeFormat, setTimeFormat] = useState("12-hour")
  const [timezone, setTimezone] = useState<string | null>("Asia/Kolkata")
  const [fiscalYearStart, setFiscalYearStart] = useState("January")

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setStatusMessage({
          type: "info",
          text: "File size exceeds 2 MB limit.",
        })
        return
      }
      setLogoName(file.name)
      setLogoPreview(URL.createObjectURL(file))
      setStatusMessage(null)
    }
  }

  function handleResetToDefaultLogo() {
    setLogoPreview(null)
    setLogoName("Google Logo (Default)")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatusMessage({
      type: "success",
      text: "Workspace settings updated successfully (Demo Mode).",
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Workspace Settings</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage your organization's identity, regional formats, and operational rules.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Company Branding */}
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs">
          <div className="flex items-center gap-3 border-b p-5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Company branding</h3>
              <p className="text-xs text-muted-foreground">
                Customize how your company identity is represented across the platform.
              </p>
            </div>
          </div>

          <div className="p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {/* Logo Preview Container */}
              <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/20">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Uploaded logo preview"
                    className="size-full object-cover"
                  />
                ) : (
                  <FcGoogle className="size-16" />
                )}
              </div>

              {/* Upload Controls */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Workspace logo</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    id="workspace-logo"
                    accept="image/svg+xml,image/png,image/jpeg"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 size-3.5" />
                    Upload logo
                  </Button>

                  {logoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetToDefaultLogo}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="mr-1.5 size-3" />
                      Reset to default
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Recommended size: 512×512px. Accepts SVG, PNG, or JPG (max. 2 MB).
                </p>
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  Active logo: {logoName}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Company Information */}
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs">
          <div className="flex items-center gap-3 border-b p-5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Globe className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Company information</h3>
              <p className="text-xs text-muted-foreground">
                General details and public presence configuration.
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="company-name" className="text-xs font-medium">
                Company name
              </Label>
              <Input
                id="company-name"
                name="companyName"
                defaultValue="Google Inc."
                placeholder="e.g. Acme Corp"
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company-website" className="text-xs font-medium">
                Website URL
              </Label>
              <div className="relative flex items-center">
                <Globe className="absolute left-3 size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="company-website"
                  name="website"
                  type="url"
                  defaultValue="https://google.com"
                  placeholder="https://example.com"
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="industry" className="text-xs font-medium">
                Industry
              </Label>
              <Select value={industry} onValueChange={(val) => setIndustry(val ?? "")}>
                <SelectTrigger id="industry" className="w-full text-xs">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Software & Technology">Software & Technology</SelectItem>
                  <SelectItem value="Financial Services">Financial Services</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Real Estate">Real Estate</SelectItem>
                  <SelectItem value="Retail & E-commerce">Retail & E-commerce</SelectItem>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Marketing & Advertising">Marketing & Advertising</SelectItem>
                  <SelectItem value="Consulting">Consulting</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Section 3: Regional Preferences */}
        <section className="rounded-xl border bg-card text-card-foreground shadow-xs">
          <div className="flex items-center gap-3 border-b p-5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Regional preferences</h3>
              <p className="text-xs text-muted-foreground">
                Set localized formatting for currency, dates, and times.
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="currency" className="flex items-center gap-1.5 text-xs font-medium">
                <Coins className="size-3.5 text-muted-foreground" />
                Default currency
              </Label>
              <Select value={currency} onValueChange={(val) => setCurrency(val ?? "")}>
                <SelectTrigger id="currency" className="w-full text-xs">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                  <SelectItem value="INR">INR - Indian Rupee (₹)</SelectItem>
                  <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound (£)</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar ($)</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar ($)</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen (¥)</SelectItem>
                  <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date-format" className="flex items-center gap-1.5 text-xs font-medium">
                <Calendar className="size-3.5 text-muted-foreground" />
                Date format
              </Label>
              <Select value={dateFormat} onValueChange={(val) => setDateFormat(val ?? "")}>
                <SelectTrigger id="date-format" className="w-full text-xs">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MMM DD, YYYY">Oct 04, 2026</SelectItem>
                  <SelectItem value="DD/MM/YYYY">04/10/2026</SelectItem>
                  <SelectItem value="MM/DD/YYYY">10/04/2026</SelectItem>
                  <SelectItem value="YYYY-MM-DD">2026-10-04</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="time-format" className="flex items-center gap-1.5 text-xs font-medium">
                <Clock className="size-3.5 text-muted-foreground" />
                Time format
              </Label>
              <Select value={timeFormat} onValueChange={(val) => setTimeFormat(val ?? "")}>
                <SelectTrigger id="time-format" className="w-full text-xs">
                  <SelectValue placeholder="Select time format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12-hour">12-hour (2:30 PM)</SelectItem>
                  <SelectItem value="24-hour">24-hour (14:30)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="workspace-timezone" className="flex items-center gap-1.5 text-xs font-medium">
                <Globe className="size-3.5 text-muted-foreground" />
                Time zone
              </Label>
              <Select value={timezone} onValueChange={(val) => setTimezone(val ?? "")}>
                <SelectTrigger id="workspace-timezone" className="w-full text-xs">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Kolkata">India Standard Time (UTC+05:30)</SelectItem>
                  <SelectItem value="America/New_York">
                    Eastern Time (UTC-05:00 / UTC-04:00)
                  </SelectItem>
                  <SelectItem value="America/Los_Angeles">
                    Pacific Time (UTC-08:00 / UTC-07:00)
                  </SelectItem>
                  <SelectItem value="Europe/London">
                    London (UTC+00:00 / UTC+01:00)
                  </SelectItem>
                  <SelectItem value="Europe/Paris">
                    Central European Time (UTC+01:00 / UTC+02:00)
                  </SelectItem>
                  <SelectItem value="Asia/Dubai">Gulf Standard Time (UTC+04:00)</SelectItem>
                  <SelectItem value="Asia/Singapore">Singapore Time (UTC+08:00)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Japan Standard Time (UTC+09:00)</SelectItem>
                  <SelectItem value="Australia/Sydney">
                    Australian Eastern Time (UTC+10:00 / UTC+11:00)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Section 4: Fiscal Year Settings */}
        <section className="rounded-xl border bg-card p-5 text-card-foreground shadow-xs">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Landmark className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Fiscal year</h3>
                <p className="max-w-md text-xs text-muted-foreground">
                  Specify when your financial reporting cycle begins for analytics and workspace summaries.
                </p>
              </div>
            </div>

            <div className="w-full space-y-1 sm:w-48">
              <Label htmlFor="fiscal-year" className="text-xs font-medium">
                Starts in
              </Label>
              <Select value={fiscalYearStart} onValueChange={(val) => setFiscalYearStart(val ?? "")}>
                <SelectTrigger id="fiscal-year" className="w-full text-xs">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`flex items-center gap-2 rounded-lg p-3 text-xs ${
              statusMessage.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <Info className="size-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" size="sm">
            Cancel
          </Button>
          <Button type="submit" size="sm">
            Save changes
          </Button>
        </div>
      </form>
    </div>
  )
}