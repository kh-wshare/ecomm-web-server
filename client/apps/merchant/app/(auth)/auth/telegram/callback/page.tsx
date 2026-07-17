"use client";

import { useEffect, useMemo } from "react";

import { telegramLoginMessageType } from "@/lib/auth/social-providers";

export default function TelegramCallbackPage() {
  const message = useMemo(() => telegramCallbackMessage(), []);

  useEffect(() => {
    if (!window.opener) return;
    window.opener.postMessage(message, telegramMessageTargetOrigin(message));
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
  const code = params.get("code") ?? hash.get("code");
  const idToken = params.get("id_token") ?? hash.get("id_token");
  const state = params.get("state") ?? hash.get("state");
  const error =
    params.get("error_description") ??
    hash.get("error_description") ??
    params.get("error") ??
    hash.get("error");

  return {
    code: code ?? undefined,
    error: error ?? undefined,
    idToken: idToken ?? undefined,
    state: state ?? undefined,
    type: telegramLoginMessageType,
  };
}

function telegramMessageTargetOrigin(message: { state?: string }) {
  const encodedOrigin = message.state?.split(".")[1];
  if (!encodedOrigin) return window.location.origin;

  try {
    const origin = new TextDecoder().decode(base64UrlToBytes(encodedOrigin));
    return URL.canParse(origin)
      ? new URL(origin).origin
      : window.location.origin;
  } catch {
    return window.location.origin;
  }
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}
