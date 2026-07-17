"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { FormField } from "./form-field";
import { postAuthSession } from "./auth-session-client";
import { SocialLoginButtons } from "./social-login-buttons";
import { SubmitButton } from "./submit-button";

import { merchantRedirectTarget } from "@/lib/auth/redirects";
import { SESSION_LOGIN_PATH } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/errors/api-error";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { validateForm } from "@/lib/validation/form";
import { useAuthStore } from "@/stores/auth-store";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => postAuthSession(SESSION_LOGIN_PATH, input),
    onSuccess: (session) => {
      useAuthStore.getState().setSession(session);
      router.replace(merchantRedirectTarget(next ?? null));
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
      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        {loginMutation.isError && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
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
          <Link
            className="mt-2 block text-right text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            href="/auth/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
        <SubmitButton isPending={loginMutation.isPending}>Sign in</SubmitButton>
      </form>
      <SocialLoginButtons next={next} />
    </div>
  );
}
