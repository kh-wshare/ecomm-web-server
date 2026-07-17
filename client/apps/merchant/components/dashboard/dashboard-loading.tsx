import { LoadingState } from "@repo/ui";

export function DashboardLoading() {
  return (
    <main className="min-h-dvh bg-background p-6">
      <LoadingState className="mx-auto h-[520px] max-w-6xl" />
    </main>
  );
}
