interface SectionHeadingProps {
  eyebrow?: string
  title: string
  description?: string
  align?: "left" | "center"
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: SectionHeadingProps) {
  return (
    <div
      className={[
        "max-w-3xl",
        align === "center"
          ? "mx-auto text-center"
          : "text-left",
      ].join(" ")}
    >
      {eyebrow && (
        <p className="mb-4 text-sm font-medium text-primary">
          {eyebrow}
        </p>
      )}

      <h2 className="text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl lg:text-5xl">
        {title}
      </h2>

      {description && (
        <p className="mt-5 text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
          {description}
        </p>
      )}
    </div>
  )
}