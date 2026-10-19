
"use client"

import {
  Building2Icon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  UsersIcon,
} from "lucide-react"

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

import type { Company } from "../companies-data"

type CompanyEditSheetProps = {
  company: Company
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CompanyEditSheet({
  company,
  open,
  onOpenChange,
}: CompanyEditSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex !w-full flex-col sm:!w-[500px] sm:!max-w-[500px]">
        <SheetHeader className="border-b px-6 py-5 text-left">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-muted">
              <Building2Icon className="size-6 text-muted-foreground" />
            </div>

            <div className="min-w-0 space-y-1">
              <SheetTitle>Edit company</SheetTitle>
              <SheetDescription>
                Update company details and business information.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Basic Information */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Basic information</h3>

            <div className="space-y-2">
              <Label htmlFor="company-name">Company name</Label>
              <Input
                id="company-name"
                defaultValue={company.name}
                placeholder="e.g. Acme Inc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-website">Website</Label>
              <div className="relative">
                <GlobeIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="company-website"
                  defaultValue={company.website}
                  placeholder="https://example.com"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-industry">Industry</Label>
                <Input
                  id="company-industry"
                  defaultValue={company.industry}
                  placeholder="e.g. Software"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-employees">Employees</Label>
                <div className="relative">
                  <UsersIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="company-employees"
                    defaultValue={company.employees}
                    placeholder="e.g. 250"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-status">Status</Label>
              <Select defaultValue={company.status}>
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
                defaultValue={company.description}
                placeholder="Briefly describe the company..."
                rows={4}
                className="resize-none"
              />
            </div>
          </section>

          {/* Contact Information */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Contact information</h3>

            <div className="space-y-2">
              <Label htmlFor="company-email">Email</Label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="company-email"
                  type="email"
                  defaultValue={company.email}
                  placeholder="contact@example.com"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-phone">Phone</Label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="company-phone"
                  defaultValue={company.phone}
                  placeholder="+1 (555) 000-0000"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-location">Location</Label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="company-location"
                  defaultValue={company.location}
                  placeholder="e.g. San Francisco, USA"
                  className="pl-9"
                />
              </div>
            </div>
          </section>
        </div>

        <SheetFooter className="border-t px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}