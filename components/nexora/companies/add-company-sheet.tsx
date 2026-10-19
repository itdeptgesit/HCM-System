
"use client"

import { useState } from "react"
import { Building2Icon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"

import type { Company, CompanyStatus } from "./companies-data"

type AddCompanySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (company: Company) => void
}

const initialForm = {
  name: "",
  website: "",
  industry: "",
  employees: "",
  email: "",
  phone: "",
  location: "",
  status: "Lead" as CompanyStatus,
  description: "",
}

export function AddCompanySheet({
  open,
  onOpenChange,
  onAdd,
}: AddCompanySheetProps) {
  const [form, setForm] = useState(initialForm)

  function updateField<K extends keyof typeof initialForm>(
    field: K,
    value: (typeof initialForm)[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const company: Company = {
      id: crypto.randomUUID(),
      ...form,
      contactCount: 0,
      lastActivity: "—",
    }

    onAdd(company)
    setForm(initialForm)
    onOpenChange(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setForm(initialForm)
    onOpenChange(nextOpen)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex !w-full flex-col sm:!w-[500px] sm:!max-w-[500px]">
        <SheetHeader className="border-b">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border bg-muted">
              <Building2Icon className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <SheetTitle>Add company</SheetTitle>
              <SheetDescription>
                Add a new company and its business information.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Company details</h3>

              <div className="space-y-2">
                <Label htmlFor="company-name">Company name</Label>
                <Input
                  id="company-name"
                  placeholder="e.g. Acme Inc."
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-website">Website</Label>
                <Input
                  id="company-website"
                  placeholder="https://example.com"
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-industry">Industry</Label>
                  <Input
                    id="company-industry"
                    placeholder="e.g. Software"
                    value={form.industry}
                    onChange={(e) => updateField("industry", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-employees">Employees</Label>
                  <Input
                    id="company-employees"
                    placeholder="e.g. 250"
                    value={form.employees}
                    onChange={(e) => updateField("employees", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => {
                    if (value) updateField("status", value as CompanyStatus)
                  }}
                >
                  <SelectTrigger id="company-status" className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Lead">Lead</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-description">Description</Label>
                <Textarea
                  id="company-description"
                  placeholder="Briefly describe the company..."
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Contact information</h3>

              <div className="space-y-2">
                <Label htmlFor="company-email">Email</Label>
                <Input
                  id="company-email"
                  type="email"
                  placeholder="contact@example.com"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-phone">Phone</Label>
                <Input
                  id="company-phone"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-location">Location</Label>
                <Input
                  id="company-location"
                  placeholder="e.g. San Francisco, USA"
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                />
              </div>
            </div>
          </div>

          <SheetFooter className="border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!form.name.trim()}>
              Add company
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}