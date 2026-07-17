import Link from "next/link";

export function AuthCard({
  children,
  description,
  footer,
  title,
}: {
  children: React.ReactNode;
  description: string;
  footer?: React.ReactNode;
  title: string;
}) {
  return (
    <div className="w-full max-w-md">
      <Link className="mb-6 flex items-center justify-center gap-3" href="/">
        <span className="grid size-10 place-items-center rounded-lg bg-emerald-600 font-black text-white">
          M
        </span>
        <span className="text-base font-semibold text-slate-950 dark:text-white">
          Merchant Admin
        </span>
      </Link>
      <section className="rounded-lg border border-slate-200 bg-white/85 p-6 backdrop-blur-xl sm:p-8 dark:border-zinc-800 dark:bg-zinc-950/85">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-zinc-400">
            {description}
          </p>
        </header>
        {children}
      </section>
      {footer && (
        <div className="mt-5 text-center text-sm text-slate-500 dark:text-zinc-400">
          {footer}
        </div>
      )}
    </div>
  );
}
