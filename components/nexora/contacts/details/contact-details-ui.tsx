
import type { ReactNode } from "react"

export function DetailsCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3.5">
        <span className="text-muted-foreground [&>svg]:size-4">
          {icon}
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>

      <div className="space-y-5 p-4">{children}</div>
    </section>
  )
}

export function InfoField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

export function EmptyPanel({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-5 py-9 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground [&>svg]:size-5">
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

export function EmptyValue() {
  return (
    <span className="text-sm text-muted-foreground">Not provided</span>
  )
}

export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}