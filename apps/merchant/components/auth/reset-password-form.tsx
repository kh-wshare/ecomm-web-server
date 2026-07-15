"use client";

import { useState } from "react";

import { Button } from "@repo/ui";

import { FormField } from "./form-field";
import { PendingIntegrationNotice } from "./pending-integration-notice";

import { resetPasswordSchema } from "@/lib/validation/auth";
import { validateForm } from "@/lib/validation/form";

export function ResetPasswordForm({ token }: { token: string }) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isValidated, setIsValidated] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = validateForm(resetPasswordSchema, {
      confirmPassword: form.get("confirmPassword"),
      password: form.get("password"),
      token: form.get("token"),
    });

    if (!result.success) {
      setErrors(result.errors);
      setIsValidated(false);
      return;
    }

    setErrors({});
    setIsValidated(true);
  };

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit}>
      <PendingIntegrationNotice endpoint="POST /auth/reset-password" />
      <FormField
        defaultValue={token}
        error={errors.token?.[0]}
        label="Reset token"
        name="token"
        placeholder="Paste your reset token"
      />
      <FormField
        autoComplete="new-password"
        error={errors.password?.[0]}
        label="New password"
        name="password"
        placeholder="At least 10 characters"
        type="password"
      />
      <FormField
        autoComplete="new-password"
        error={errors.confirmPassword?.[0]}
        label="Confirm new password"
        name="confirmPassword"
        placeholder="Repeat your password"
        type="password"
      />
      {isValidated && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
          Password and token validation passed.
        </p>
      )}
      <Button fullWidth type="submit" variant="secondary">
        Validate new password
      </Button>
    </form>
  );
}
