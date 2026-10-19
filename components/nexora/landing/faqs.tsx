"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion"
import { motion } from "motion/react"

import { Section } from "./section"
import { SectionHeading } from "./section-heading"
import { Reveal } from "./motion"

const faqs = [
  {
    question: "What is Nexora CRM?",
    answer:
      "Nexora is a modern CRM template built for developers who want a polished starting point for building CRM and SaaS applications. It includes ready-made interfaces for leads, contacts, companies, deals, activities, calendar, team management, reports, and settings.",
  },
  {
    question: "What technologies does Nexora use?",
    answer:
      "Nexora is built with TanStack Start, React, TypeScript, Tailwind CSS, and shadcn/ui. It also uses TanStack Table for data-heavy interfaces and modern React libraries for charts and other UI functionality.",
  },
  {
    question: "Do I get the full source code?",
    answer:
      "Yes. The purchase includes the complete Nexora source code so you can customize the interface, modify components, connect your own backend, and adapt the template to your project.",
  },
  {
    question: "Can I customize Nexora?",
    answer:
      "Yes. Nexora is designed to be customized. You can change the branding, colors, layouts, components, navigation, CRM workflows, and connect it to your own APIs or backend services.",
  },
  {
    question: "Is Nexora responsive?",
    answer:
      "Yes. The interface is designed to work across desktop, tablet, and mobile screen sizes. The layouts, tables, navigation, forms, and other CRM interfaces are built with responsive behavior in mind.",
  },
  {
    question: "Does Nexora include a backend?",
    answer:
      "Nexora is primarily a frontend CRM template and UI foundation. You can connect it to your preferred backend, database, authentication system, APIs, or SaaS infrastructure.",
  },
  {
    question: "Does Nexora include dark mode?",
    answer:
      "Yes. Nexora includes both light and dark themes using the application's theme system, allowing you to provide users with a consistent experience in either mode.",
  },
  {
    question: "Will Nexora receive updates?",
    answer:
      "Yes. Updates can include improvements, bug fixes, UI enhancements, and compatibility updates as the project evolves.",
  },
]

export function Faqs() {
  return (
    <Section id="faqs" className="border-t py-20 sm:py-24">
      <Reveal>
        <SectionHeading
          eyebrow="FAQS"
          title="Questions & Answers"
          description="Everything you need to know about Nexora CRM and how to get started."
        />
      </Reveal>

      <Reveal
        variant="scaleIn"
        className="mx-auto mt-16 max-w-4xl"
      >
        <Accordion className="w-full divide-y rounded-3xl border bg-card px-6 sm:px-10">
          {faqs.map((faq, index) => (
            <motion.div
              key={faq.question}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.5,
                delay: index * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <AccordionItem
                value={`item-${index}`}
                className="border-b-0"
              >
                <AccordionTrigger className="gap-4 py-6 text-left hover:no-underline">
                  <span className="flex items-baseline gap-4">
                    <span className="font-mono text-xs text-muted-foreground/60">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="text-base font-medium tracking-tight text-foreground">
                      {faq.question}
                    </span>
                  </span>
                </AccordionTrigger>

                <AccordionContent className="pb-6 pl-9 pr-8 text-sm leading-7 text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </Reveal>
    </Section>
  )
}