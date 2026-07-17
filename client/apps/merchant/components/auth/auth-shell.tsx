"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { SESSION_ME_PATH } from "@/lib/auth/session";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useQuery({
    queryFn: async () => {
      const response = await fetch(SESSION_ME_PATH, {
        credentials: "include",
      });

      return response.ok;
    },
    queryKey: ["merchant-auth-shell-session"],
    retry: false,
  });

  useEffect(() => {
    if (session.data) router.replace("/dashboard");
  }, [router, session.data]);

  if (session.isPending || session.data) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 dark:bg-zinc-950">
        <div
          aria-label="Checking session"
          className="size-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-950 dark:border-zinc-800 dark:border-t-white"
          role="status"
        />
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_32rem),linear-gradient(135deg,#f8fafc,#eef2ff_55%,#f8fafc)] px-4 py-8 sm:px-6 dark:bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_32rem),linear-gradient(135deg,#09090b,#18181b_55%,#0f172a)]">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl items-center justify-center">
        {children}
      </div>
    </main>
  );
}
