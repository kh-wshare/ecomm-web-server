"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import type { AuthResult } from "@/types/auth";
import { apiClient } from "@/lib/api/client";
import {
  getFirebaseGoogleIdToken,
  getTelegramIdToken,
  isSocialLoginCancelled,
  socialProviderConfig,
} from "@/lib/auth/social-providers";
import { authTokenStorage } from "@/lib/auth/token-storage";
import { getErrorMessage } from "@/lib/errors/api-error";
import { useAuthStore } from "@/stores/auth-store";

export function SocialLoginButtons() {
  const router = useRouter();
  const [providerError, setProviderError] = useState<unknown>(null);

  const socialLogin = useMutation({
    mutationFn: async ({
      idToken,
      provider,
    }: {
      idToken: string;
      provider: "firebase-google" | "telegram";
    }) => {
      const response = await apiClient.post<AuthResult>(
        `/auth/login/${provider}`,
        { idToken },
        {
          authenticated: false,
          merchantId: null,
        },
      );

      return response.data;
    },
    onSuccess: (session) => {
      setProviderError(null);
      authTokenStorage.setSession(
        session.accessToken,
        session.activeMerchant?.merchant.id ?? null,
        session.refreshToken,
      );
      useAuthStore.getState().setSession(session);
      router.replace("/dashboard");
    },
  });
  const startSocialLogin = async (provider: "firebase-google" | "telegram") => {
    setProviderError(null);
    try {
      const idToken =
        provider === "firebase-google"
          ? await getFirebaseGoogleIdToken()
          : await getTelegramIdToken();

      socialLogin.mutate({ idToken, provider });
    } catch (error) {
      if (isSocialLoginCancelled(error)) {
        setProviderError(new Error(cancelledMessage(provider)));
        return;
      }
      setProviderError(error);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-separator" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Or continue with
        </span>
        <span className="h-px flex-1 bg-separator" />
      </div>

      {(providerError || socialLogin.isError) && (
        <div
          className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {getErrorMessage(providerError ?? socialLogin.error)}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          className="h-11 rounded-xl border border-separator bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
          disabled={
            !socialProviderConfig.firebaseConfigured || socialLogin.isPending
          }
          type="button"
          onClick={() => void startSocialLogin("firebase-google")}
        >
          Google
        </button>
        <button
          className="h-11 rounded-xl border border-separator bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
          disabled={
            !socialProviderConfig.telegramConfigured || socialLogin.isPending
          }
          type="button"
          onClick={() => void startSocialLogin("telegram")}
        >
          Telegram
        </button>
      </div>
    </div>
  );
}

function cancelledMessage(provider: "firebase-google" | "telegram") {
  return provider === "telegram"
    ? "Telegram login was cancelled."
    : "Google login was cancelled.";
}
