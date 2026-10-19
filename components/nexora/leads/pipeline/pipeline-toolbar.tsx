"use client"

import { SearchIcon } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

const owners = ["All owners", "Alex Morgan", "Priya Nair", "Daniel Cho"]

export function PipelineToolbar() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-72">
        <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search pipeline..." className="h-8 pl-8" />
      </div>

      <Select defaultValue="All owners">
        <SelectTrigger className="h-9 w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {owners.map((owner) => (
            <SelectItem key={owner} value={owner}>
              {owner}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}