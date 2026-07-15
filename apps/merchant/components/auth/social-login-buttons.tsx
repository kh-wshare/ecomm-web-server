"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button, Icon, Separator } from "@repo/ui";

import { postAuthSession } from "./auth-session-client";

import { merchantRedirectTarget } from "@/lib/auth/redirects";
import { MERCHANT_BASE_PATH } from "@/lib/auth/session";
import {
  getFirebaseGoogleIdToken,
  getTelegramIdToken,
  isSocialLoginCancelled,
  socialProviderConfig,
} from "@/lib/auth/social-providers";
import { getErrorMessage } from "@/lib/errors/api-error";
import { useAuthStore } from "@/stores/auth-store";

type Provider = "firebase-google" | "telegram";

export function SocialLoginButtons({ next }: { next?: string }) {
  const router = useRouter();
  const [providerError, setProviderError] = useState<Error | null>(null);
  const socialLogin = useMutation({
    mutationFn: async ({
      idToken,
      provider,
    }: {
      idToken: string;
      provider: Provider;
    }) =>
      postAuthSession(`${MERCHANT_BASE_PATH}/auth/session/social/${provider}`, {
        idToken,
      }),
    onSuccess: (session) => {
      useAuthStore.getState().setSession(session);
      router.replace(merchantRedirectTarget(next ?? null));
    },
  });

  const startSocialLogin = async (provider: Provider) => {
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

      setProviderError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs font-medium uppercase text-slate-400">
          or
        </span>
        <Separator className="flex-1" />
      </div>
      {(providerError || socialLogin.isError) && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {getErrorMessage(providerError ?? socialLogin.error)}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          fullWidth
          isDisabled={!socialProviderConfig.firebaseConfigured || socialLogin.isPending}
          type="button"
          variant="secondary"
          onPress={() => void startSocialLogin("firebase-google")}
        >
          <Icon icon="logos:google-icon" />
          Google
        </Button>
        <Button
          fullWidth
          isDisabled={!socialProviderConfig.telegramConfigured || socialLogin.isPending}
          type="button"
          variant="secondary"
          onPress={() => void startSocialLogin("telegram")}
        >
          <Icon icon="logos:telegram" />
          Telegram
        </Button>
      </div>
    </div>
  );
}

function cancelledMessage(provider: Provider) {
  return provider === "telegram"
    ? "Telegram login was cancelled."
    : "Google login was cancelled.";
}
