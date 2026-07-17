"use client";

import { Button, Form } from "@heroui/react";
import { useState } from "react";

import { FormField } from "./form-field";
import { PendingIntegrationNotice } from "./pending-integration-notice";

import { forgotPasswordSchema } from "@/lib/validation/auth";
import { validateForm } from "@/lib/validation/form";

export function ForgotPasswordForm() {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isValidated, setIsValidated] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = validateForm(forgotPasswordSchema, {
      email: form.get("email"),
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
      <PendingIntegrationNotice endpoint="POST /auth/forgot-password" />
      <FormField
        autoComplete="email"
        error={errors.email?.[0]}
        label="Email address"
        name="email"
        placeholder="you@example.com"
        type="email"
      />
      {isValidated && (
        <p className="rounded-xl bg-success/10 px-3 py-2 text-xs text-success">
          The form is valid. It can submit as soon as the backend endpoint is
          available.
        </p>
      )}
      <Button fullWidth type="submit" variant="secondary">
        Validate recovery request
      </Button>
    </Form>
  );
}
