"use client";

import { Form } from "@heroui/react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";

import type { AuthResult } from "@/types/auth";
import type { RegisterInput } from "@/lib/validation/auth";
import { apiClient } from "@/lib/api/client";
import { authTokenStorage } from "@/lib/auth/token-storage";
import { getErrorMessage } from "@/lib/errors/api-error";
import { registerSchema } from "@/lib/validation/auth";
import { validateForm } from "@/lib/validation/form";
import { useAuthStore } from "@/stores/auth-store";

export function RegisterForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const registerMutation = useMutation({
    mutationFn: async ({
      confirmPassword: _confirmPassword,
      ...input
    }: RegisterInput) => {
      const response = await apiClient.post<AuthResult>(
        "/auth/register-merchant",
        input,
        { authenticated: false, merchantId: null },
      );

      return response.data;
    },
    onSuccess: (session) => {
      authTokenStorage.setSession(
        session.accessToken,
        session.activeMerchant?.merchant.id ?? null,
        session.refreshToken,
      );
      useAuthStore.getState().setSession(session);
      router.replace("/dashboard");
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = validateForm(registerSchema, {
      merchantName: form.get("merchantName"),
      fullName: form.get("fullName"),
      email: form.get("email"),
      phone: String(form.get("phone") ?? "") || undefined,
      password: form.get("password"),
      confirmPassword: form.get("confirmPassword"),
    });

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    registerMutation.mutate(result.data);
  };

  return (
    <Form
      className="space-y-4"
      validationBehavior="aria"
      onSubmit={handleSubmit}
    >
      {registerMutation.isError && (
        <div
          className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {getErrorMessage(registerMutation.error)}
        </div>
      )}
      <FormField
        autoComplete="organization"
        error={errors.merchantName?.[0]}
        label="Business name"
        name="merchantName"
        placeholder="Acme Store"
      />
      <FormField
        autoComplete="name"
        error={errors.fullName?.[0]}
        label="Your name"
        name="fullName"
        placeholder="Jane Doe"
      />
      <FormField
        autoComplete="email"
        error={errors.email?.[0]}
        label="Email address"
        name="email"
        placeholder="you@example.com"
        type="email"
      />
      <FormField
        autoComplete="tel"
        error={errors.phone?.[0]}
        label="Phone number (optional)"
        name="phone"
        placeholder="+1 555 123 4567"
        type="tel"
      />
      <FormField
        autoComplete="new-password"
        error={errors.password?.[0]}
        label="Password"
        name="password"
        placeholder="At least 10 characters"
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
      <p className="text-xs leading-5 text-muted">
        Use at least 10 characters with uppercase, lowercase, number, and
        symbol.
      </p>
      <SubmitButton isPending={registerMutation.isPending}>
        Create merchant account
      </SubmitButton>
    </Form>
  );
}
