import type { InputHTMLAttributes } from "react";

import { Input, Label } from "@repo/ui";

export function FormField({
  error,
  label,
  name,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  label: string;
  name: string;
}) {
  const fieldId = props.id ?? name;

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium" htmlFor={fieldId}>
        {label}
      </Label>
      <Input
        {...props}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        aria-invalid={Boolean(error)}
        fullWidth
        id={fieldId}
        name={name}
      />
      {error && (
        <p className="text-xs text-red-600" id={`${fieldId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
