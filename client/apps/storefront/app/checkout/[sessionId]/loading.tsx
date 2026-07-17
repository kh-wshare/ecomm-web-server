export default function CheckoutLoading() {
  return (
    <main className="min-h-dvh bg-background px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="h-8 w-44 animate-pulse rounded bg-surface-secondary" />
        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <div className="h-36 animate-pulse rounded-2xl bg-surface-secondary" />
            <div className="h-64 animate-pulse rounded-2xl bg-surface-secondary" />
          </div>
          <div className="h-80 animate-pulse rounded-2xl bg-surface-secondary" />
        </div>
      </div>
    </main>
  );
}
