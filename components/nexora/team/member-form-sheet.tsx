import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { ROLE_CONFIG, TEAM_ROLES } from "./team-data"
import {
  draftToValues,
  type MemberDraft,
  type MemberValues,
} from "./team-draft"

interface MemberFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pass a new `key` from the parent each time the sheet opens to reset the form. */
  initial: MemberDraft
  /** Returns an error message, or null when saved. */
  onSave: (values: MemberValues, id?: string) => string | null
}

export function MemberFormSheet({
  open,
  onOpenChange,
  initial,
  onSave,
}: MemberFormSheetProps) {
  const [draft, setDraft] = useState<MemberDraft>(initial)
  const [error, setError] = useState("")

  const isEdit = Boolean(initial.id)

  const update = <K extends keyof MemberDraft>(key: K, value: MemberDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setError("")
  }

  const handleSubmit = () => {
    const result = draftToValues(draft)
    if ("error" in result) {
      setError(result.error)
      return
    }

    const saveError = onSave(result.values, draft.id)
    if (saveError) {
      setError(saveError)
      return
    }
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex !w-full flex-col sm:!w-[500px] sm:!max-w-[500px]">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit member" : "Invite team member"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update this member's details, role and quota."
              : "They'll receive an email invitation to join Nexora CRM."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="member-name">Full name</Label>
            <Input
              id="member-name"
              placeholder="e.g. Priya Sharma"
              value={draft.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="member-email">Email</Label>
            <Input
              id="member-email"
              type="email"
              placeholder="name@company.com"
              value={draft.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="member-title">Job title</Label>
            <Input
              id="member-title"
              placeholder="e.g. Account Executive"
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>Role</Label>
            <div className="grid gap-2">
              {TEAM_ROLES.map((role) => {
                const { icon: Icon, description } = ROLE_CONFIG[role]
                const active = draft.role === role

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => update("role", role)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{role}</div>
                      <div className="text-xs text-muted-foreground">{description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="member-phone">Phone</Label>
              <Input
                id="member-phone"
                placeholder="Optional"
                value={draft.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-location">Location</Label>
              <Input
                id="member-location"
                placeholder="Optional"
                value={draft.location}
                onChange={(e) => update("location", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="member-quota">Quarterly quota ($)</Label>
            <Input
              id="member-quota"
              type="number"
              min={0}
              placeholder="e.g. 300000"
              value={draft.quota}
              onChange={(e) => update("quota", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for roles without a revenue target.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {isEdit ? "Save changes" : "Send invite"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
