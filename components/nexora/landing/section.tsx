import type { ReactNode } from "react"

interface SectionProps {
  id?: string
  children: ReactNode
  className?: string
}

export function Section({
  id,
  children,
  className = "",
}: SectionProps) {
  return (
    <section
      id={id}
      className={`relative overflow-hidden py-24 sm:py-32 ${className}`}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </section>
  )
}