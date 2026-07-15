"use client";

import { createBrowserApiClient } from "@repo/api-client";

import { env } from "@/lib/env";

declare global {
  interface Window {
    firebase?: {
      apps: unknown[];
      initializeApp: (config: Record<string, string | undefined>) => void;
      auth: () => {
        signInWithPopup: (provider: unknown) => Promise<{
          user?: { getIdToken: () => Promise<string> } | null;
        }>;
      };
    } & {
      auth: { GoogleAuthProvider: new () => unknown };
    };
  }
}

const FIREBASE_APP_SCRIPT =
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js";
const FIREBASE_AUTH_SCRIPT =
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js";
const TELEGRAM_OIDC_ORIGIN = "https://oauth.telegram.org";
const TELEGRAM_AUTH_URL = `${TELEGRAM_OIDC_ORIGIN}/auth`;
const TELEGRAM_MESSAGE_TYPE = "merchant-hub.telegram-login";
const SOCIAL_LOGIN_CANCELLED_CODES = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "popup_closed",
]);
const apiClient = createBrowserApiClient({ env });

export const socialProviderConfig = {
  firebaseConfigured: Boolean(
    env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      env.NEXT_PUBLIC_FIREBASE_APP_ID,
  ),
  telegramConfigured: Boolean(env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID),
};

export async function getFirebaseGoogleIdToken() {
  await loadScript(FIREBASE_APP_SCRIPT);
  await loadScript(FIREBASE_AUTH_SCRIPT);

  const firebase = window.firebase;
  if (!firebase) throw new Error("Firebase SDK did not load");
  if (!firebase.apps.length) {
    firebase.initializeApp({
      apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
      appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
      authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  const result = await firebase.auth().signInWithPopup(provider);
  const idToken = await result.user?.getIdToken();
  if (!idToken) throw new Error("Google login did not return an ID token");
  return idToken;
}

export async function getTelegramIdToken() {
  const clientId = Number(env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID);
  if (!Number.isFinite(clientId)) {
    throw new Error("Telegram login is not configured");
  }

  const authRequest = await createTelegramAuthRequest(clientId);

  return new Promise<string>((resolve, reject) => {
    let isSettled = false;
    const popup = window.open(
      authRequest.url,
      "telegram_oidc_login",
      popupFeatures(550, 650),
    );

    if (!popup) {
      reject(new Error("Telegram login popup was blocked"));
      return;
    }

    const settle = (callback: () => void) => {
      if (isSettled) return;
      isSettled = true;
      window.removeEventListener("message", onMessage);
      callback();
    };

    const checkClose = () => {
      if (isSettled) return;
      if (popup.closed) {
        settle(() => reject(new Error("popup_closed")));
        return;
      }
      window.setTimeout(checkClose, 200);
    };

    const onMessage = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== TELEGRAM_OIDC_ORIGIN &&
        event.origin !== window.location.origin &&
        event.origin !== authRequest.redirectOrigin
      ) {
        return;
      }
      if (event.source !== popup) return;

      const data = parseTelegramAuthMessage(event.data);
      if (
        data?.type !== TELEGRAM_MESSAGE_TYPE &&
        data?.event !== "auth_result"
      ) {
        return;
      }
      if (data.error) {
        settle(() => reject(new Error(data.error)));
        return;
      }
      if (data.state !== authRequest.state) {
        settle(() => reject(new Error("Invalid Telegram login state")));
        return;
      }
      if (data.idToken ?? data.result) {
        settle(() => resolve(data.idToken ?? data.result ?? ""));
        return;
      }
      if (data.code) {
        const code = data.code;
        settle(() => {
          void exchangeTelegramCode({
            code,
            codeVerifier: authRequest.codeVerifier,
            redirectUri: authRequest.redirectUri,
          })
            .then(resolve)
            .catch(reject);
        });
        return;
      }

      settle(() =>
        reject(
          new Error("Telegram login did not return an authorization code"),
        ),
      );
    };

    window.addEventListener("message", onMessage);
    popup.focus();
    checkClose();
  });
}

function createTelegramAuthRequest(clientId: number) {
  const state = telegramState();
  const codeVerifier = randomBase64Url(32);

  return sha256Base64Url(codeVerifier).then((codeChallenge) => {
    const redirectUri = telegramRedirectUri();

    return {
      codeVerifier,
      redirectOrigin: new URL(redirectUri).origin,
      redirectUri,
      state,
      url: telegramAuthUrl({
        clientId,
        codeChallenge,
        redirectUri,
        state,
      }),
    };
  });
}

function telegramState() {
  return `${randomBase64Url(32)}.${base64Url(
    new TextEncoder().encode(window.location.origin),
  )}`;
}

function telegramAuthUrl(options: {
  clientId: number;
  codeChallenge: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL(TELEGRAM_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", String(options.clientId));
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("scope", "openid profile phone");
  url.searchParams.set("state", options.state);
  url.searchParams.set("code_challenge", options.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("nonce", crypto.randomUUID());
  return url.toString();
}

async function exchangeTelegramCode(options: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}) {
  const response = await apiClient.post<{ idToken: string }, typeof options>(
    "/auth/telegram/token",
    options,
  );

  return response.idToken;
}

function telegramRedirectUri() {
  return (
    env.NEXT_PUBLIC_TELEGRAM_REDIRECT_URI ||
    `${window.location.origin}/merchant/auth/telegram/callback`
  );
}

function popupFeatures(width: number, height: number) {
  const left = Math.max(0, (window.screen.width - width) / 2);
  const top = Math.max(0, (window.screen.height - height) / 2);
  return [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "status=0",
    "location=0",
    "menubar=0",
    "toolbar=0",
  ].join(",");
}

function parseTelegramAuthMessage(data: unknown) {
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    if (!parsed || typeof parsed !== "object") return null;
    const message = parsed as {
      code?: unknown;
      error?: unknown;
      event?: unknown;
      idToken?: unknown;
      id_token?: unknown;
      result?: unknown;
      state?: unknown;
      type?: unknown;
    };

    return {
      code: typeof message.code === "string" ? message.code : undefined,
      error: typeof message.error === "string" ? message.error : undefined,
      event: typeof message.event === "string" ? message.event : undefined,
      idToken:
        typeof message.idToken === "string"
          ? message.idToken
          : typeof message.id_token === "string"
            ? message.id_token
            : undefined,
      result: typeof message.result === "string" ? message.result : undefined,
      state: typeof message.state === "string" ? message.state : undefined,
      type: typeof message.type === "string" ? message.type : undefined,
    };
  } catch {
    return null;
  }
}

function randomBase64Url(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function sha256Base64Url(value: string) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return base64Url(new Uint8Array(hash));
}

function base64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(
    "",
  );
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export const telegramLoginMessageType = TELEGRAM_MESSAGE_TYPE;

export function isSocialLoginCancelled(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code =
    "code" in error && typeof error.code === "string" ? error.code : null;
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : null;

  return Boolean(
    (code && SOCIAL_LOGIN_CANCELLED_CODES.has(code)) ||
      (message && SOCIAL_LOGIN_CANCELLED_CODES.has(message)),
  );
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.loaded = "false";
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener("error", () => reject(), { once: true });
    document.head.appendChild(script);
  });
}
