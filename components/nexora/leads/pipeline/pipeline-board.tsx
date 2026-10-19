import type { Lead, LeadStatus } from "../leads-data"
import { PipelineColumn } from "./pipeline-column"

const stages: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Lost",
]

export function PipelineBoard({ leads }: { leads: Lead[] }) {
  return (
    <div className="-mx-4 min-h-0 flex-1 overflow-x-auto px-4 pb-2">
      <div className="flex h-full items-stretch gap-4">
        {stages.map((stage) => (
          <PipelineColumn
            key={stage}
            status={stage}
            leads={leads.filter((lead) => lead.status === stage)}
          />
        ))}
      </div>
    </div>
  )
}