export default function StorefrontLoading() {
  return (
    <main className="min-h-dvh bg-white text-zinc-900">
      <div className="h-18 animate-pulse border-b border-zinc-200 bg-zinc-50" />
      <div className="mx-auto max-w-7xl space-y-10 px-5 py-8 sm:px-8">
        <div className="h-[520px] animate-pulse rounded-3xl bg-zinc-100" />
        <div className="h-9 w-56 animate-pulse rounded-lg bg-zinc-100" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              className="h-96 animate-pulse rounded-2xl bg-zinc-100"
              key={index}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
