"use client";

import { Button } from "@heroui/react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getFirebaseGoogleIdToken,
  getTelegramIdToken,
  isSocialLoginCancelled,
  socialProviderConfig,
} from "@/lib/auth/social-providers";
import { getErrorMessage } from "@/lib/errors/api-error";
import {
  getCustomerSession,
  loginCustomerSession,
  logoutCustomerSession,
} from "@/lib/storefront/customer-session";

const customerSessionQueryKey = ["storefront", "customer-session"];

export function StorefrontCustomerAuth() {
  const queryClient = useQueryClient();
  const [providerError, setProviderError] = useState<unknown>(null);
  const customerQuery = useQuery({
    queryFn: getCustomerSession,
    queryKey: customerSessionQueryKey,
  });
  const login = useMutation({
    mutationFn: loginCustomerSession,
    onSuccess: (session) => {
      setProviderError(null);
      queryClient.setQueryData(customerSessionQueryKey, session);
    },
  });
  const logout = useMutation({
    mutationFn: logoutCustomerSession,
    onSuccess: () => queryClient.setQueryData(customerSessionQueryKey, null),
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

  const customer = customerQuery.data;
  if (customer) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden max-w-36 truncate text-xs font-semibold opacity-70 sm:inline">
          {customer.user.fullName}
        </span>
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onPress={() => logout.mutate()}
        >
          {logout.isPending ? "Signing out..." : "Sign out"}
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
        isDisabled={!socialProviderConfig.firebaseConfigured || login.isPending}
        size="sm"
        type="button"
        variant="secondary"
        onPress={() => void startSocialLogin("firebase-google")}
      >
        Google
      </Button>
      <Button
        isDisabled={!socialProviderConfig.telegramConfigured || login.isPending}
        size="sm"
        type="button"
        variant="secondary"
        onPress={() => void startSocialLogin("telegram")}
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
