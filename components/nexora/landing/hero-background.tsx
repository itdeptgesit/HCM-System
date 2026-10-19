export function HeroBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Dotted matrix */}
      <div
        className="
          absolute inset-x-0 top-0 h-[950px]
          text-foreground/[0.12]
          dark:text-foreground/[0.22]
          [background-image:radial-gradient(circle,currentColor_1px,transparent_1px)]
          [background-size:18px_18px]
          [mask-image:linear-gradient(to_bottom,black_75%,transparent_100%)]
        "
      />

      {/* Perspective grid */}
      <div
        className="
          absolute left-1/2 top-[300px]
          h-[1800px] w-[150%]
          -translate-x-1/2
          text-foreground/[0.08]
          dark:text-foreground/[0.15]
          [transform:perspective(520px)_rotateX(58deg)]
          [transform-origin:top_center]
          [background-image:
            linear-gradient(to_right,currentColor_1px,transparent_1px),
            linear-gradient(to_bottom,currentColor_1px,transparent_1px)
          ]
          [background-size:64px_64px]
        "
      />
    </div>
  )
}