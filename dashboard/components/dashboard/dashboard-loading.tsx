export function DashboardLoading() {
  return (
    <div
      aria-label="Loading dashboard"
      className="min-h-dvh bg-background"
      role="status"
    >
      <div className="fixed inset-y-0 left-0 hidden w-64 border-r border-separator bg-surface p-5 lg:block">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-surface-secondary" />
        <div className="mt-10 space-y-3">
          {Array.from({ length: 7 }, (_, index) => (
            <div
              className="h-10 animate-pulse rounded-xl bg-surface-secondary"
              key={index}
            />
          ))}
        </div>
      </div>
      <div className="lg:pl-64">
        <div className="h-16 border-b border-separator bg-surface" />
        <div className="space-y-5 p-6 lg:p-8">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-surface-secondary" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                className="h-32 animate-pulse rounded-2xl bg-surface"
                key={index}
              />
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading dashboard</span>
    </div>
  );
}
