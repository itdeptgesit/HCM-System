"use client"

import { useState, type FormEvent } from "react"

import type { Contact, ContactStatus } from "./contacts-data"

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"

type AddContactSheetProps = {
  onAddContact: (contact: Omit<Contact, "id">) => void
}

const initialForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  status: "Lead" as ContactStatus,
  lastContacted: "Not contacted",
}

export function AddContactSheet({ onAddContact }: AddContactSheetProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(initialForm)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    onAddContact(form)
    setForm(initialForm)
    setOpen(false)
  }

  function handleChange(field: keyof typeof initialForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <span className="text-lg leading-none">+</span>
        Add Contact
      </Button>

      {/* Added p-6 to provide inner padding for the sheet content */}
      <SheetContent side="right" className="w-full p-6 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="p-0">
          <SheetTitle>Add Contact</SheetTitle>
          <SheetDescription>
            Add a new contact to your customer database.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <div className="space-y-2">
            <Label htmlFor="contact-name">Full Name</Label>
            <Input
              id="contact-name"
              placeholder="Enter full name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-company">Company</Label>
            <Input
              id="contact-company"
              placeholder="Enter company name"
              value={form.company}
              onChange={(e) => handleChange("company", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">Email Address</Label>
            <Input
              id="contact-email"
              type="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-phone">Phone Number</Label>
            <Input
              id="contact-phone"
              type="tel"
              placeholder="Enter phone number"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(value) =>
                handleChange("status", value ?? "Lead")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Contact</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}