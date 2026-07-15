export function DashboardHomeLoading() {
  return (
    <div className="space-y-6" role="status">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-zinc-800" />
        <div className="h-8 w-72 max-w-full animate-pulse rounded-lg bg-slate-200 dark:bg-zinc-800" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="h-36 animate-pulse rounded-lg bg-white dark:bg-zinc-900"
            key={index}
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-lg bg-white dark:bg-zinc-900 lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-lg bg-white dark:bg-zinc-900" />
        <div className="h-72 animate-pulse rounded-lg bg-white dark:bg-zinc-900 lg:col-span-2" />
      </div>
      <span className="sr-only">Loading dashboard overview</span>
    </div>
  );
}
