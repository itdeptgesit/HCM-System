import { FileTextIcon } from "lucide-react"

import { Textarea } from "@workspace/ui/components/textarea"

import { LeadFormField } from "./lead-form-field"
import { LeadFormSection } from "./lead-form-section"

export function LeadFormNotes() {
  return (
    <LeadFormSection
      icon={FileTextIcon}
      title="Notes"
      description="Context your team should know before reaching out."
    >
      <LeadFormField
        label="Internal notes"
        htmlFor="notes"
        hint="Only visible to your team."
      >
        <Textarea
          id="notes"
          name="notes"
          rows={5}
          placeholder="How did you meet? What are they looking for?"
        />
      </LeadFormField>
    </LeadFormSection>
  )
}