"use client";

import { Button, Form } from "@heroui/react";
import { useState } from "react";

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
      token: form.get("token"),
      password: form.get("password"),
      confirmPassword: form.get("confirmPassword"),
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
    <Form
      className="space-y-4"
      validationBehavior="aria"
      onSubmit={handleSubmit}
    >
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
        <p className="rounded-xl bg-success/10 px-3 py-2 text-xs text-success">
          Password and token validation passed.
        </p>
      )}
      <Button fullWidth type="submit" variant="secondary">
        Validate new password
      </Button>
    </Form>
  );
}
