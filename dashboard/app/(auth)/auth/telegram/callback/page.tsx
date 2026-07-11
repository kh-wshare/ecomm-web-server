"use client";

import { useEffect, useMemo } from "react";
import { telegramLoginMessageType } from "@/lib/auth/social-providers";

export default function TelegramCallbackPage() {
  const message = useMemo(() => telegramCallbackMessage(), []);

  useEffect(() => {
    if (!window.opener) return;
    window.opener.postMessage(message, window.location.origin);
    window.close();
  }, [message]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-sm text-muted">
      {message.error
        ? "Telegram login failed."
        : "Completing Telegram login..."}
    </main>
  );
}

function telegramCallbackMessage() {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const idToken = params.get("id_token") ?? hash.get("id_token");
  const error =
    params.get("error_description") ??
    hash.get("error_description") ??
    params.get("error") ??
    hash.get("error");

  return {
    error: error ?? undefined,
    idToken: idToken ?? undefined,
    type: telegramLoginMessageType,
  };
}
