"use client";

import { Form } from "@heroui/react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { FormField } from "./form-field";
import { SocialLoginButtons } from "./social-login-buttons";
import { SubmitButton } from "./submit-button";

import type { AuthResult } from "@/types/auth";
import type { LoginInput } from "@/lib/validation/auth";
import { apiClient } from "@/lib/api/client";
import { authTokenStorage } from "@/lib/auth/token-storage";
import { getErrorMessage } from "@/lib/errors/api-error";
import { validateForm } from "@/lib/validation/form";
import { loginSchema } from "@/lib/validation/auth";
import { useAuthStore } from "@/stores/auth-store";

export function LoginForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const loginMutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      const response = await apiClient.post<AuthResult>("/auth/login", input, {
        authenticated: false,
        merchantId: null,
      });

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
    const result = validateForm(loginSchema, {
      email: form.get("email"),
      password: form.get("password"),
    });

    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    loginMutation.mutate(result.data);
  };

  return (
    <div className="space-y-5">
      <Form
        className="space-y-4"
        validationBehavior="aria"
        onSubmit={handleSubmit}
      >
        {loginMutation.isError && (
          <div
            className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {getErrorMessage(loginMutation.error)}
          </div>
        )}
        <FormField
          autoComplete="email"
          error={errors.email?.[0]}
          label="Email address"
          name="email"
          placeholder="you@example.com"
          type="email"
        />
        <div>
          <FormField
            autoComplete="current-password"
            error={errors.password?.[0]}
            label="Password"
            name="password"
            placeholder="Enter your password"
            type="password"
          />
          <a
            className="mt-2 block text-right text-xs font-medium text-accent hover:underline"
            href="/auth/forgot-password"
          >
            Forgot password?
          </a>
        </div>
        <SubmitButton isPending={loginMutation.isPending}>Sign in</SubmitButton>
      </Form>
      <SocialLoginButtons />
    </div>
  );
}
