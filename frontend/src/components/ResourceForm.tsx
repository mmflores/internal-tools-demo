import { useForm } from "react-hook-form"
import type { DefaultValues, FieldValues, Path } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ZodType } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export interface FieldSpec<T> {
  name: Path<T>
  label: string
  type?: "text" | "textarea" | "select"
  placeholder?: string
  options?: { label: string; value: string }[]
}

interface ResourceFormProps<T extends FieldValues> {
  schema: ZodType<T>
  fields: FieldSpec<T>[]
  defaultValues: DefaultValues<T>
  submitLabel?: string
  onSubmit: (values: T) => Promise<void> | void
}

/** Schema-driven form so new resources need a field list, not new form code. */
export function ResourceForm<T extends FieldValues>({
  schema,
  fields,
  defaultValues,
  submitLabel = "Submit",
  onSubmit,
}: ResourceFormProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema as never),
    defaultValues,
  })

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
      {fields.map((field) => {
        const error = form.formState.errors[field.name]?.message as string | undefined
        return (
          <div key={String(field.name)} className="space-y-2">
            <Label htmlFor={String(field.name)}>{field.label}</Label>
            {field.type === "textarea" ? (
              <Textarea
                id={String(field.name)}
                placeholder={field.placeholder}
                {...form.register(field.name)}
              />
            ) : field.type === "select" ? (
              <Select
                onValueChange={(value) =>
                  form.setValue(field.name, value as never, { shouldValidate: true })
                }
                defaultValue={defaultValues[field.name] as string | undefined}
              >
                <SelectTrigger id={String(field.name)}>
                  <SelectValue placeholder={field.placeholder ?? "Select…"} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={String(field.name)}
                placeholder={field.placeholder}
                {...form.register(field.name)}
              />
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )
      })}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  )
}
