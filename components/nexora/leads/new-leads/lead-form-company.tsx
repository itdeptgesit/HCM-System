import { Building2Icon } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { LeadFormField } from "./lead-form-field"
import { LeadFormSection } from "./lead-form-section"

const industries = [
  "Technology",
  "Finance",
  "Healthcare",
  "Retail",
  "Logistics",
  "Manufacturing",
  "Education",
  "Other",
]

const companySizes = ["1–10", "11–50", "51–200", "201–500", "500+"]

export function LeadFormCompany() {
  return (
    <LeadFormSection
      icon={Building2Icon}
      title="Company"
      description="The organization this lead works for."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <LeadFormField label="Company name" htmlFor="company" required>
          <Input id="company" name="company" placeholder="Globex" />
        </LeadFormField>

        <LeadFormField label="Website" htmlFor="website">
          <Input
            id="website"
            name="website"
            type="url"
            placeholder="https://globex.com"
          />
        </LeadFormField>

        <LeadFormField label="Industry" htmlFor="industry">
          <Select name="industry">
            <SelectTrigger id="industry" className="w-full">
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </LeadFormField>

        <LeadFormField label="Company size" htmlFor="company-size">
          <Select name="companySize">
            <SelectTrigger id="company-size" className="w-full">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {companySizes.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </LeadFormField>

        <LeadFormField label="Location" htmlFor="location" className="sm:col-span-2">
          <Input id="location" name="location" placeholder="San Francisco, USA" />
        </LeadFormField>
      </div>
    </LeadFormSection>
  )
}