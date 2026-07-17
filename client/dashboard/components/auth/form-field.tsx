import { FieldError, Input, Label, TextField } from "@heroui/react";
import type { InputHTMLAttributes } from "react";

export function FormField({
  error,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  label: string;
}) {
  return (
    <TextField className="block" isInvalid={Boolean(error)} name={props.name}>
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      <Input {...props} fullWidth variant="secondary" />
      {error && <FieldError className="mt-1.5 text-xs">{error}</FieldError>}
    </TextField>
  );
}
