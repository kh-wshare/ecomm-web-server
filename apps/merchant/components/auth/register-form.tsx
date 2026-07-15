"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { FormField } from "./form-field";
import { postAuthSession } from "./auth-session-client";
import { SubmitButton } from "./submit-button";

import { merchantRedirectTarget } from "@/lib/auth/redirects";
import { SESSION_REGISTER_PATH } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/errors/api-error";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { validateForm } from "@/lib/validation/form";
import { useAuthStore } from "@/stores/auth-store";

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const registerMutation = useMutation({
    mutationFn: ({
      confirmPassword: _confirmPassword,
      ...input
    }: RegisterInput) => postAuthSession(SESSION_REGISTER_PATH, input),
    onSuccess: (session) => {
      useAuthStore.getState().setSession(session);
      router.replace(merchantRedirectTarget(next ?? null));
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = validateForm(registerSchema, {
      confirmPassword: form.get("confirmPassword"),
      email: form.get("email"),
      fullName: form.get("fullName"),
      merchantName: form.get("merchantName"),
      password: form.get("password"),
      phone: String(form.get("phone") ?? "") || undefined,
    });

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    registerMutation.mutate(result.data);
  };

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit}>
      {registerMutation.isError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
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
      <p className="text-xs leading-5 text-slate-500 dark:text-zinc-400">
        Use at least 10 characters with uppercase, lowercase, number, and
        symbol.
      </p>
      <SubmitButton isPending={registerMutation.isPending}>
        Create merchant account
      </SubmitButton>
    </form>
  );
}
