import { cn } from "@/lib/utils"
import { Loader2Icon } from '@/components/ui/icons'

function Spinner({ className, strokeWidth, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      strokeWidth={typeof strokeWidth === 'number' ? strokeWidth : undefined}
      {...(props as any)}
    />
  )
}

export { Spinner }
