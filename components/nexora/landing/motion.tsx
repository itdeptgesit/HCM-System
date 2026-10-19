"use client"

import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "motion/react"

import { type CSSProperties } from "react"

/* ---------- Tokens (change once, updates everywhere) ---------- */
export const EASE = [0.22, 1, 0.36, 1] as const
export const DURATION = 0.6
export const STAGGER = 0.08
export const VIEWPORT = { once: true, margin: "-80px" } as const
export const step = (i: number) => ({ "--i": i }) as CSSProperties

/* ---------- Variants ---------- */
// `show` reads `custom` as a delay, so <Reveal delay={0.2}> works.
const make = (
  hidden: Record<string, number>,
  show: Record<string, number>
): Variants => ({
  hidden,
  show: (delay: number = 0) => ({
    ...show,
    transition: {
      duration: DURATION,
      ease: EASE,
      ...(delay ? { delay } : {}),
    },
  }),
})

export const fadeUp = make({ opacity: 0, y: 24 }, { opacity: 1, y: 0 })
export const fadeIn = make({ opacity: 0 }, { opacity: 1 })
export const scaleIn = make(
  { opacity: 0, scale: 0.96, y: 16 },
  { opacity: 1, scale: 1, y: 0 }
)
export const slideLeft = make({ opacity: 0, x: -32 }, { opacity: 1, x: 0 })
export const slideRight = make({ opacity: 0, x: 32 }, { opacity: 1, x: 0 })

export const stagger = (delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: STAGGER, delayChildren: delay } },
})

/* ---------- Components ---------- */
type Variant = "fadeUp" | "fadeIn" | "scaleIn" | "slideLeft" | "slideRight"

const variantMap: Record<Variant, Variants> = {
  fadeUp,
  fadeIn,
  scaleIn,
  slideLeft,
  slideRight,
}

/** Animates itself when scrolled into view. Use for standalone blocks. */
export function Reveal({
  variant = "fadeUp",
  delay = 0,
  ...props
}: HTMLMotionProps<"div"> & { variant?: Variant; delay?: number }) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      variants={variantMap[variant]}
      custom={delay}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={VIEWPORT}
      {...props}
    />
  )
}

/** Parent container: triggers its <Item> children one after another. */
export function Stagger({
  delay = 0,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number }) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      variants={stagger(delay)}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={VIEWPORT}
      {...props}
    />
  )
}

/** Child of <Stagger>. Inherits the trigger from its parent. */
export function Item({
  variant = "fadeUp",
  ...props
}: HTMLMotionProps<"div"> & { variant?: Variant }) {
  return <motion.div variants={variantMap[variant]} {...props} />
}

/* ---------- Shared hover/tap presets ---------- */
export const hoverLift = {
  whileHover: { y: -4 },
  transition: { duration: 0.25, ease: EASE },
}

export const pressable = {
  whileTap: { scale: 0.97 },
}

/* ---------- Hero (above the fold, plays on mount) ---------- */
// No opacity here, so content stays visible during SSR/hydration.
const heroVariants: Variants = {
  hidden: { y: 16 },
  show: { y: 0, transition: { duration: 0.5, ease: EASE } },
}

export function HeroItem(props: HTMLMotionProps<"div">) {
  return <motion.div variants={heroVariants} {...props} />
}

export function HeroStagger(props: HTMLMotionProps<"div">) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      initial={reduce ? false : "hidden"}
      animate="show"
      {...props}
    />
  )
}