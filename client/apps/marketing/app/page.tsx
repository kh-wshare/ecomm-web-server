"use client";

import { Button, Card, Chip, Icon, Separator } from "@repo/ui";

const capabilities = [
  {
    title: "Merchant admin",
    text: "Products, inventory, branches, orders, payments, storefront theme, and social posts in one operating console.",
    icon: "solar:widget-5-bold-duotone",
  },
  {
    title: "Storefront",
    text: "Public shopping pages for product discovery, variants, cart, checkout, and order status.",
    icon: "solar:shop-2-bold-duotone",
  },
  {
    title: "Point of sale",
    text: "Staff login, branch register, quick cart, payment capture, and receipts for in-person sales.",
    icon: "solar:cash-register-bold-duotone",
  },
  {
    title: "Gateway ready",
    text: "Micro-frontends can route through one gateway while each app keeps its own deployment lifecycle.",
    icon: "solar:routing-3-bold-duotone",
  },
];

const workflow = [
  "Create catalog",
  "Publish channels",
  "Sell online or POS",
  "Track operations",
];

const metrics = [
  { label: "Apps", value: "4" },
  { label: "Channels", value: "5" },
  { label: "Ops views", value: "12+" },
];

const customers = ["Retail", "Cafe", "Boutique", "Marketplace", "Pop-up", "Services"];

export default function MarketingHome() {
  return (
    <main className="min-h-dvh overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-separator/70 bg-background/88 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <a className="flex items-center gap-3" href="#top">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-white">
              <Icon icon="solar:bolt-circle-bold" width={21} />
            </span>
            <span className="text-sm font-semibold">Systelst Commerce</span>
          </a>
          <div className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
            <a className="hover:text-foreground" href="#platform">Platform</a>
            <a className="hover:text-foreground" href="#workflow">Workflow</a>
            <a className="hover:text-foreground" href="#clients">Clients</a>
          </div>
          <Button className="bg-primary text-white" size="sm">
            <Icon icon="solar:calendar-add-bold" width={18} />
            Book demo
          </Button>
        </nav>
      </header>

      <section
        id="top"
        className="relative border-b border-separator bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(8, 13, 23, 0.86), rgba(8, 13, 23, 0.52), rgba(8, 13, 23, 0.22)), url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=2200&q=80')",
        }}
      >
        <div className="mx-auto flex min-h-[76dvh] max-w-7xl items-center px-5 py-14">
          <div className="marketing-rise max-w-3xl text-white">
            <Chip className="border border-white/20 bg-white/12 text-white" variant="soft">
              Commerce system for growing merchants
            </Chip>
            <h1 className="mt-6 text-5xl font-semibold tracking-normal md:text-7xl">
              Systelst Commerce
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/78 md:text-lg">
              A clean commerce operating system for storefront, POS, inventory, payments, branches, and social selling.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="h-12 bg-primary px-5 text-white" size="lg">
                <Icon icon="solar:rocket-2-bold" width={20} />
                Launch workspace
              </Button>
              <Button className="h-12 border border-white/25 bg-white/12 px-5 text-white shadow-none backdrop-blur-md" size="lg" variant="outline">
                <Icon icon="solar:play-circle-bold" width={20} />
                View product tour
              </Button>
            </div>
            <div className="mt-9 grid max-w-xl grid-cols-3 gap-3">
              {metrics.map((item) => (
                <div className="rounded-lg border border-white/16 bg-white/10 p-4 backdrop-blur-md" key={item.label}>
                  <p className="text-2xl font-semibold">{item.value}</p>
                  <p className="mt-1 text-xs font-medium text-white/68">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-5 py-16">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <Chip className="bg-surface-secondary text-muted" variant="soft">Platform modules</Chip>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-normal md:text-4xl">
              Built as focused apps that still feel like one system.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted">
            Each surface can move independently, while shared API contracts and design tokens keep the client experience consistent.
          </p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {capabilities.map((item) => (
              <Card className="border border-separator bg-surface shadow-none" key={item.title}>
                <div className="p-5">
                  <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon icon={item.icon} width={23} />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{item.text}</p>
                </div>
              </Card>
            ))}
          </div>
          <ProductVisual />
        </div>
      </section>

      <section id="workflow" className="border-y border-separator bg-surface">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Chip className="bg-primary/10 text-primary" variant="soft">Business requirement ready</Chip>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal md:text-4xl">
              Clear client journey from setup to daily operation.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              The landing page explains what the system does, who it helps, and how each module connects without overwhelming buyers with internal architecture.
            </p>
          </div>
          <div className="grid gap-3">
            {workflow.map((item, index) => (
              <div className="flex items-center gap-4 rounded-lg border border-separator bg-background p-4" key={item}>
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold">{item}</p>
                  <p className="text-sm text-muted">
                    {workflowCopy[index]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="clients" className="mx-auto max-w-7xl px-5 py-16">
        <div className="overflow-hidden rounded-lg border border-separator bg-surface">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <p className="text-sm font-semibold">Designed for practical commerce teams</p>
            <Chip className="bg-surface-secondary text-muted" variant="soft">Multi-channel</Chip>
          </div>
          <Separator />
          <div className="relative flex overflow-hidden py-5">
            <div className="marketing-marquee flex min-w-max gap-3 px-3">
              {[...customers, ...customers].map((item, index) => (
                <span className="rounded-md border border-separator bg-background px-5 py-3 text-sm font-medium text-muted" key={`${item}-${index}`}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-lg border border-primary/20 bg-primary p-7 text-white md:p-9">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-normal md:text-3xl">
                Ready to present the platform to clients.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
                Use this marketing app as the public entry point for demos, investor previews, and merchant onboarding.
              </p>
            </div>
            <Button className="h-12 bg-white px-5 text-primary" size="lg">
              <Icon icon="solar:arrow-right-up-bold" width={20} />
              Start client demo
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProductVisual() {
  return (
    <div className="marketing-float rounded-lg border border-separator bg-surface p-3 shadow-none">
      <div className="rounded-md border border-separator bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Commerce command center</p>
            <p className="text-xs text-muted">Live operating snapshot</p>
          </div>
          <Chip className="bg-primary/10 text-primary" variant="soft">Online</Chip>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_0.8fr]">
          <div className="rounded-lg border border-separator bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Sales flow</p>
              <Icon className="text-primary" icon="solar:chart-2-bold" width={22} />
            </div>
            <div className="mt-5 space-y-3">
              {["Storefront checkout", "POS receipt", "Social order"].map((item, index) => (
                <div className="flex items-center gap-3" key={item}>
                  <span className="h-2.5 rounded-full bg-primary" style={{ width: `${86 - index * 16}%` }} />
                  <span className="w-28 text-xs text-muted">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-lg border border-separator bg-surface p-4">
              <p className="text-xs text-muted">Inventory health</p>
              <p className="mt-2 text-2xl font-semibold">96%</p>
            </div>
            <div className="rounded-lg border border-separator bg-surface p-4">
              <p className="text-xs text-muted">Orders today</p>
              <p className="mt-2 text-2xl font-semibold">128</p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {["Products", "Payments", "Branches"].map((item) => (
            <div className="rounded-md border border-separator bg-surface-secondary p-3" key={item}>
              <p className="text-xs font-medium text-muted">{item}</p>
              <div className="mt-3 h-2 rounded-full bg-primary/30">
                <div className="h-2 w-2/3 rounded-full bg-primary" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const workflowCopy = [
  "Add products, variants, branch stock, and selling channel visibility.",
  "Push the same catalog into storefront, POS, and social sales surfaces.",
  "Accept orders and payments with clear source tracking for every sale.",
  "Review inventory movement, branch activity, fulfillment, and payment state.",
];
