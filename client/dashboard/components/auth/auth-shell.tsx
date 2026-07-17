"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { authTokenStorage } from "@/lib/auth/token-storage";

const subscribeToHydration = () => () => undefined;
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;
const getServerTokenSnapshot = () => null;

export function AuthShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  const accessToken = useSyncExternalStore(
    authTokenStorage.subscribe,
    authTokenStorage.getAccessToken,
    getServerTokenSnapshot,
  );

  useEffect(() => {
    if (isHydrated && accessToken) router.replace("/dashboard");
  }, [accessToken, isHydrated, router]);

  if (!isHydrated || accessToken) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <div
          aria-label="Checking session"
          className="size-8 animate-spin rounded-full border-2 border-accent/25 border-t-accent"
          role="status"
        />
      </div>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute -left-32 top-[-10rem] size-[30rem] rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 size-[32rem] rounded-full bg-success/10 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl items-center justify-center">
        {children}
      </div>
    </main>
  );
}
