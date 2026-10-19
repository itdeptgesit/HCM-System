import type { LucideIcon } from "lucide-react"
import { ChevronDown } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

interface FilterOption {
  value: string
  label: string
}

interface PipelineFilterMenuProps {
  label: string
  icon: LucideIcon
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}

export function PipelineFilterMenu({
  label,
  icon: Icon,
  value,
  options,
  onChange,
}: PipelineFilterMenuProps) {
  const isActive = value !== "all"
  const selected = options.find((o) => o.value === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`${buttonVariants({ variant: "outline" })} gap-2 ${
          isActive ? "border-primary/50 bg-primary/5" : ""
        }`}
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span>{isActive ? selected?.label : label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}