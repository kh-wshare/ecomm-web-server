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
        <span className="grid size-10 place-items-center rounded-2xl bg-accent font-black text-accent-foreground shadow-lg shadow-accent/20">
          M
        </span>
        <span className="text-base font-semibold">Merchant Commerce Hub</span>
      </Link>
      <section className="rounded-3xl border border-separator bg-surface/95 p-6 shadow-2xl shadow-black/5 backdrop-blur sm:p-8">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </header>
        {children}
      </section>
      {footer && <div className="mt-5 text-center text-sm">{footer}</div>}
    </div>
  );
}
