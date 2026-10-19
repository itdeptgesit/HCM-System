
import { CameraIcon, UserIcon } from "lucide-react"

import { Input } from "@workspace/ui/components/input"

import { LeadFormField } from "./lead-form-field"
import { LeadFormSection } from "./lead-form-section"
import { leadSchema, type LeadFormApi } from "./use-lead-form"

type LeadFormContactProps = {
  form: LeadFormApi
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error

  if (typeof error === "object" && error !== null && "message" in error) {
    return String(error.message)
  }

  return String(error)
}

export function LeadFormContact({ form }: LeadFormContactProps) {
  return (
    <LeadFormSection
      icon={UserIcon}
      title="Contact information"
      description="Who is this lead and how can we reach them?"
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Upload photo"
          className="flex size-16 shrink-0 items-center justify-center rounded-full border border-dashed bg-muted/40 text-muted-foreground transition-colors hover:bg-muted"
        >
          <CameraIcon className="size-5" />
        </button>

        <div>
          <p className="text-sm font-medium">Profile photo</p>
          <p className="text-xs text-muted-foreground">
            JPG or PNG, up to 2 MB
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field
          name="firstName"
          validators={{
            onBlur: leadSchema.shape.firstName,
          }}
        >
          {(field) => (
            <LeadFormField
              label="First name"
              htmlFor="first-name"
              required
            >
              <Input
                id="first-name"
                name={field.name}
                placeholder="Sarah"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
              />

              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">
                  {field.state.meta.errors.map(getErrorMessage).join(", ")}
                </p>
              )}
            </LeadFormField>
          )}
        </form.Field>

        <form.Field name="lastName">
          {(field) => (
            <LeadFormField label="Last name" htmlFor="last-name">
              <Input
                id="last-name"
                name={field.name}
                placeholder="Chen"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
              />

              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">
                  {field.state.meta.errors.map(getErrorMessage).join(", ")}
                </p>
              )}
            </LeadFormField>
          )}
        </form.Field>

        <form.Field
          name="email"
          validators={{
            onBlur: leadSchema.shape.email,
          }}
        >
          {(field) => (
            <LeadFormField label="Email" htmlFor="email" required>
              <Input
                id="email"
                name={field.name}
                type="email"
                placeholder="sarah@globex.com"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
              />

              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">
                  {field.state.meta.errors.map(getErrorMessage).join(", ")}
                </p>
              )}
            </LeadFormField>
          )}
        </form.Field>

        <form.Field
  name="phone"
  validators={{
    onBlur: leadSchema.shape.phone,
  }}
>
  {(field) => (
    <LeadFormField label="Phone" htmlFor="phone" required>
      <Input
        id="phone"
        name={field.name}
        type="tel"
        placeholder="+1 (555) 000-0000"
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={field.state.meta.errors.length > 0}
      />

      {field.state.meta.errors.length > 0 && (
        <p className="text-sm text-destructive">
          {field.state.meta.errors.map(getErrorMessage).join(", ")}
        </p>
      )}
    </LeadFormField>
  )}
</form.Field>

        <form.Field
  name="jobTitle"
  validators={{
    onBlur: leadSchema.shape.jobTitle,
  }}
>
  {(field) => (
    <LeadFormField
      label="Job title"
      htmlFor="job-title"
      required
      className="sm:col-span-2"
    >
      <Input
        id="job-title"
        name={field.name}
        placeholder="Head of Operations"
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={field.state.meta.errors.length > 0}
      />

      {field.state.meta.errors.length > 0 && (
        <p className="text-sm text-destructive">
          {field.state.meta.errors.map(getErrorMessage).join(", ")}
        </p>
      )}
    </LeadFormField>
  )}
</form.Field>
      </div>
    </LeadFormSection>
  )
}