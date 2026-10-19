"use client"

import { useState, type FormEvent } from "react"

import type { Deal, DealStage } from "./deals-data"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

type CreateDealSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (deal: Deal) => void
}

const initialForm = {
  name: "",
  company: "",
  contact: "",
  value: "",
  stage: "Qualification" as DealStage,
  probability: "25",
  expectedClose: "",
  owner: "",
}

export function CreateDealSheet({
  open,
  onOpenChange,
  onCreate,
}: CreateDealSheetProps) {
  const [form, setForm] = useState(initialForm)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const newDeal: Deal = {
      id: crypto.randomUUID(),
      name: form.name,
      company: form.company,
      contact: form.contact,
      value: Number(form.value) || 0,
      stage: form.stage,
      probability: Number(form.probability) || 0,
      expectedClose: form.expectedClose,
      owner: form.owner,
      lastActivity: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
    }

    onCreate(newDeal)
    setForm(initialForm)
    onOpenChange(false)
  }

  const handleClose = (value: boolean) => {
    onOpenChange(value)

    if (!value) {
      setForm(initialForm)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-xl"
      >
        <SheetHeader className="px-6 pt-6">
          <SheetTitle className="text-xl">Create Deal</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deal-name">Deal Name</Label>
              <Input
                id="deal-name"
                placeholder="e.g. Enterprise Rollout"
                value={form.name}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    name: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deal-company">Company</Label>
                <Input
                  id="deal-company"
                  placeholder="Company name"
                  value={form.company}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      company: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deal-contact">Contact</Label>
                <Input
                  id="deal-contact"
                  placeholder="Contact name"
                  value={form.contact}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      contact: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deal-value">Deal Value ($)</Label>
                <Input
                  id="deal-value"
                  type="number"
                  min="0"
                  placeholder="e.g. 50000"
                  value={form.value}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      value: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Stage</Label>
                <Select
                  value={form.stage}
                  onValueChange={(value) => {
                    if (value) {
                      setForm((current) => ({
                        ...current,
                        stage: value as DealStage,
                      }))
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Qualification">
                      Qualification
                    </SelectItem>
                    <SelectItem value="Proposal">Proposal</SelectItem>
                    <SelectItem value="Negotiation">
                      Negotiation
                    </SelectItem>
                    <SelectItem value="Won">Won</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deal-probability">
                  Probability (%)
                </Label>
                <Input
                  id="deal-probability"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 75"
                  value={form.probability}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      probability: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deal-close-date">
                  Expected Close
                </Label>
                <Input
                  id="deal-close-date"
                  placeholder="e.g. Dec 28, 2026"
                  value={form.expectedClose}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      expectedClose: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deal-owner">Deal Owner</Label>
              <Input
                id="deal-owner"
                placeholder="e.g. Alex Morgan"
                value={form.owner}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    owner: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t px-4 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Deal</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}