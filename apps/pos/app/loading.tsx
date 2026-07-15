export default function PosLoading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
        <div className="h-12 w-12 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-6 h-7 w-44 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 space-y-3">
          <div className="h-11 animate-pulse rounded bg-slate-100" />
          <div className="h-11 animate-pulse rounded bg-slate-100" />
          <div className="h-11 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    </main>
  );
}
