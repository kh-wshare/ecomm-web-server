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
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        {...props}
        aria-invalid={Boolean(error)}
        className={`h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition placeholder:text-muted/70 ${
          error
            ? "border-danger focus:border-danger"
            : "border-separator hover:border-border-secondary focus:border-accent"
        } ${props.className ?? ""}`}
      />
      {error && (
        <span className="mt-1.5 block text-xs text-danger">{error}</span>
      )}
    </label>
  );
}
