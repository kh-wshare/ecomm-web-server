"use client";

import { useState, useSyncExternalStore } from "react";
import { useMutation } from "@tanstack/react-query";

import type { AuthResult } from "@/types/auth";
import { Button } from "@/components/ui/hero-controls";
import { apiClient } from "@/lib/api/client";
import {
  getFirebaseGoogleIdToken,
  getTelegramIdToken,
  isSocialLoginCancelled,
  socialProviderConfig,
} from "@/lib/auth/social-providers";
import { getErrorMessage } from "@/lib/errors/api-error";
import { storefrontCustomerSession } from "@/lib/storefront/customer-session";

const getServerSnapshot = () => null;

export function StorefrontCustomerAuth() {
  const [providerError, setProviderError] = useState<unknown>(null);
  const customer = useSyncExternalStore(
    storefrontCustomerSession.subscribe,
    storefrontCustomerSession.get,
    getServerSnapshot,
  );
  const login = useMutation({
    mutationFn: async ({
      idToken,
      provider,
    }: {
      idToken: string;
      provider: "firebase-google" | "telegram";
    }) => {
      const response = await apiClient.post<AuthResult>(
        `/auth/customer/login/${provider}`,
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
      storefrontCustomerSession.set(session);
    },
  });
  const startSocialLogin = async (provider: "firebase-google" | "telegram") => {
    setProviderError(null);
    try {
      const idToken =
        provider === "firebase-google"
          ? await getFirebaseGoogleIdToken()
          : await getTelegramIdToken();
      login.mutate({ idToken, provider });
    } catch (error) {
      if (isSocialLoginCancelled(error)) {
        setProviderError(new Error(cancelledMessage(provider)));
        return;
      }
      setProviderError(error);
    }
  };

  if (customer) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden max-w-36 truncate text-xs font-semibold opacity-70 sm:inline">
          {customer.user.fullName}
        </span>
        <Button
          className="rounded-full border px-3 py-1.5 text-xs font-semibold"
          type="button"
          onClick={() => storefrontCustomerSession.clear()}
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {(providerError || login.isError) && (
        <span className="hidden max-w-44 truncate text-xs text-red-600 sm:inline">
          {getErrorMessage(providerError ?? login.error)}
        </span>
      )}
      <Button
        className="rounded-full border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!socialProviderConfig.firebaseConfigured || login.isPending}
        type="button"
        onClick={() => void startSocialLogin("firebase-google")}
      >
        Google
      </Button>
      <Button
        className="rounded-full border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!socialProviderConfig.telegramConfigured || login.isPending}
        type="button"
        onClick={() => void startSocialLogin("telegram")}
      >
        Telegram
      </Button>
    </div>
  );
}

function cancelledMessage(provider: "firebase-google" | "telegram") {
  return provider === "telegram"
    ? "Telegram login was cancelled."
    : "Google login was cancelled.";
}
