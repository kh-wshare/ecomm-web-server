export default function PosLoading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-separator bg-surface p-6">
        <div className="h-12 w-12 animate-pulse rounded-lg bg-surface-secondary" />
        <div className="mt-6 h-7 w-44 animate-pulse rounded bg-surface-secondary" />
        <div className="mt-6 space-y-3">
          <div className="h-11 animate-pulse rounded bg-surface-secondary" />
          <div className="h-11 animate-pulse rounded bg-surface-secondary" />
          <div className="h-11 animate-pulse rounded bg-surface-secondary" />
        </div>
      </div>
    </main>
  );
}
