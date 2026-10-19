import { SlidersHorizontalIcon } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

import { statusStyles } from "../leads-data"
import { LeadFormField } from "./lead-form-field"
import { LeadFormSection } from "./lead-form-section"

const statuses = Object.keys(statusStyles)
const sources = ["Referral", "Outbound", "Inbound", "Website", "Partner"]
const owners = ["Alex Morgan", "Priya Nair", "Daniel Cho"] // TODO: load from your team API
const priorities = ["Low", "Medium", "High"]

export function LeadFormDetails() {
  return (
    <LeadFormSection
      icon={SlidersHorizontalIcon}
      title="Lead details"
      description="Pipeline stage, ownership and value."
    >
      <LeadFormField label="Status" htmlFor="status">
        <Select name="status" defaultValue="New">
          <SelectTrigger id="status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </LeadFormField>

      <LeadFormField label="Source" htmlFor="source">
        <Select name="source">
          <SelectTrigger id="source" className="w-full">
            <SelectValue placeholder="Where did they come from?" />
          </SelectTrigger>
          <SelectContent>
            {sources.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </LeadFormField>

      <LeadFormField label="Owner" htmlFor="owner">
        <Select name="owner">
          <SelectTrigger id="owner" className="w-full">
            <SelectValue placeholder="Assign to a teammate" />
          </SelectTrigger>
          <SelectContent>
            {owners.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </LeadFormField>

      <LeadFormField label="Priority" htmlFor="priority">
        <Tabs defaultValue="Medium">
          <TabsList className="w-full">
            {priorities.map((item) => (
              <TabsTrigger key={item} value={item} className="flex-1">
                {item}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </LeadFormField>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <LeadFormField label="Estimated value" htmlFor="value">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              id="value"
              name="value"
              type="number"
              placeholder="0"
              className="pl-7"
            />
          </div>
        </LeadFormField>

        <LeadFormField label="Expected close" htmlFor="close-date">
          <Input id="close-date" name="closeDate" type="date" />
        </LeadFormField>
      </div>
    </LeadFormSection>
  )
}