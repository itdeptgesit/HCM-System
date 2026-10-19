import { useState } from "react"
import {
  FaLinkedin,
  FaGithub,
  FaXTwitter,
  FaDribbble,
  FaGlobe,
} from "react-icons/fa6"
import { Check, Copy } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

const socialPlatforms = [
  {
    id: "linkedin",
    label: "LinkedIn profile",
    icon: FaLinkedin,
    defaultValue: "https://linkedin.com/in/alexmorgan",
    placeholder: "https://linkedin.com/in/username",
  },
  {
    id: "github",
    label: "GitHub profile",
    icon: FaGithub,
    defaultValue: "https://github.com/alexmorgan",
    placeholder: "https://github.com/username",
  },
  {
    id: "twitter",
    label: "X (Twitter) profile",
    icon: FaXTwitter,
    defaultValue: "https://x.com/alexmorgan",
    placeholder: "https://x.com/username",
  },
  {
    id: "dribbble",
    label: "Dribbble profile",
    icon: FaDribbble,
    defaultValue: "https://dribbble.com/alexmorgan",
    placeholder: "https://dribbble.com/username",
  },
  {
    id: "website",
    label: "Personal website",
    icon: FaGlobe,
    defaultValue: "https://alexmorgan.dev",
    placeholder: "https://yourwebsite.com",
  },
]

export function SocialProfilesSection() {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [socialValues, setSocialValues] = useState<Record<string, string>>(() =>
    socialPlatforms.reduce(
      (acc, item) => ({ ...acc, [item.id]: item.defaultValue }),
      {}
    )
  )

  function handleCopy(id: string, text: string) {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleChange(id: string, value: string) {
    setSocialValues((prev) => ({ ...prev, [id]: value }))
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Social profiles</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Connect your accounts for workspace context. Click copy to share your link.
        </p>
      </div>

      <div className="space-y-3">
        {socialPlatforms.map((platform) => {
          const Icon = platform.icon
          const isCopied = copiedId === platform.id
          const currentValue = socialValues[platform.id] || ""

          return (
            <div key={platform.id} className="space-y-1.5">
              <Label htmlFor={platform.id} className="text-xs font-medium">
                {platform.label}
              </Label>
              <div className="relative flex items-center">
                <Icon className="absolute left-3 size-4 text-muted-foreground shrink-0" />
                <Input
                  id={platform.id}
                  name={platform.id}
                  value={currentValue}
                  onChange={(e) => handleChange(platform.id, e.target.value)}
                  placeholder={platform.placeholder}
                  className="pl-9 pr-10 text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(platform.id, currentValue)}
                  disabled={!currentValue}
                  title="Copy link"
                  className="absolute right-2 flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                >
                  {isCopied ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}