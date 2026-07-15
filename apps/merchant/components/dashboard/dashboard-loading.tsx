import { LoadingState } from "@repo/ui";

export function DashboardLoading() {
  return (
    <main className="min-h-dvh bg-slate-50 p-6 dark:bg-zinc-950">
      <LoadingState className="mx-auto h-[520px] max-w-6xl" />
    </main>
  );
}
