
import { useForm } from "@tanstack/react-form"
import { z } from "zod"

export const leadSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string(),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .refine(
      (value) => {
        if (!value) return true

        const digits = value.replace(/\D/g, "")

        return (
          /^\+?[0-9\s().-]+$/.test(value) &&
          digits.length >= 7 &&
          digits.length <= 15
        )
      },
      "Enter a valid phone number",
    ),
  jobTitle: z
    .string()
    .trim()
    .min(1, "Job title is required")
    .max(100, "Job title must be 100 characters or fewer"),
})

export function useLeadForm() {
  return useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      jobTitle: "",
    },
    validators: {
      onSubmit: leadSchema,
    },
    onSubmit: async ({ value }) => {
      console.log("Validated lead:", value)
    },
  })
}

export type LeadFormApi = ReturnType<typeof useLeadForm>