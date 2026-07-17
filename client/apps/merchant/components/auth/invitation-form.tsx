"use client";

import { useState } from "react";

import { Button } from "@repo/ui";

import { FormField } from "./form-field";
import { PendingIntegrationNotice } from "./pending-integration-notice";

import { invitationSchema } from "@/lib/validation/auth";
import { validateForm } from "@/lib/validation/form";

export function InvitationForm({ token }: { token: string }) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isValidated, setIsValidated] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = validateForm(invitationSchema, {
      confirmPassword: form.get("confirmPassword"),
      fullName: form.get("fullName"),
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
      <PendingIntegrationNotice endpoint="POST /merchant-users/accept-invite" />
      <FormField
        defaultValue={token}
        error={errors.token?.[0]}
        label="Invitation token"
        name="token"
        placeholder="Paste your invitation token"
      />
      <FormField
        autoComplete="name"
        error={errors.fullName?.[0]}
        label="Full name"
        name="fullName"
        placeholder="Jane Doe"
      />
      <FormField
        autoComplete="new-password"
        error={errors.password?.[0]}
        label="Password"
        name="password"
        placeholder="Create a strong password"
        type="password"
      />
      <FormField
        autoComplete="new-password"
        error={errors.confirmPassword?.[0]}
        label="Confirm password"
        name="confirmPassword"
        placeholder="Repeat your password"
        type="password"
      />
      {isValidated && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
          Invitation details are valid and ready to submit.
        </p>
      )}
      <Button fullWidth type="submit" variant="secondary">
        Validate invitation
      </Button>
    </form>
  );
}
