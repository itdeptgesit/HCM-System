import { Link } from "@tanstack/react-router"
import { ArrowLeftIcon, CheckIcon, XIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

export function LeadFormHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Button
          render={<Link to="/leads" />}
          nativeButton={false}
          variant="outline"
          size="icon"
          aria-label="Back to leads"
        >
          <ArrowLeftIcon className="size-4" />
        </Button>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add Lead</h1>
          <p className="text-sm text-muted-foreground">
            Create a new lead and assign it to your team.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          render={<Link to="/leads" />}
          nativeButton={false}
          variant="ghost"
          size="sm"
        >
          <XIcon className="size-4" />
          Cancel
        </Button>

        <Button type="submit" className="gap-1.5" size="sm">
          <CheckIcon className="size-4" />
          Save Lead
        </Button>
      </div>
    </div>
  )
}