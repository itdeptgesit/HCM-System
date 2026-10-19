
import { SlidersHorizontal } from "lucide-react"

export function SettingsHeader() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">
          Settings
        </h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Manage your account, workspace preferences, and CRM configuration.
      </p>
    </div>
  )
}
