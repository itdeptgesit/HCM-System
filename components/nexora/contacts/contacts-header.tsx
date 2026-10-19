"use client"

import { AddContactSheet } from "./add-contact-sheet"

export function ContactsHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Contacts
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your customer relationships and contact information.
        </p>
      </div>

      <AddContactSheet onAddContact={() => {}} />
    </div>
  )
}