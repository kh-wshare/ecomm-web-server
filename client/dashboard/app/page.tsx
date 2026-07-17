"use client";

import { Icon } from "@iconify/react";
import { Button, Card, Chip, Separator } from "@heroui/react";

const metrics = [
  { label: "Checkout recovery", value: "18%", tone: "success" },
  { label: "Low-stock risk", value: "12 SKUs", tone: "warning" },
  { label: "Orders today", value: "428", tone: "accent" },
] as const;

const modules = [
  {
    icon: "gravity-ui:shopping-bag",
    title: "Product catalog",
    text: "Publish products, variants, media, channel visibility, and pricing from one workspace.",
  },
  {
    icon: "gravity-ui:truck",
    title: "Inventory control",
    text: "Track stock, movements, reservations, and alerts before orders create fulfillment pressure.",
  },
  {
    icon: "gravity-ui:credit-card",
    title: "Payments",
    text: "Connect payment providers, inspect transactions, and reconcile checkout status with orders.",
  },
  {
    icon: "gravity-ui:paint-roller",
    title: "Storefront builder",
    text: "Adjust brand color, typography, product layout, homepage sections, and customer storefront settings.",
  },
] as const;

const workflow = [
  "Create catalog",
  "Sync stock",
  "Launch storefront",
  "Sell and fulfill",
] as const;

const faqs = [
  {
    question: "Who is this system for?",
    answer:
      "Merchant teams that need product, inventory, storefront, checkout, payment, and order operations in one dashboard.",
  },
  {
    question: "Can clients manage their own storefront?",
    answer:
      "Yes. The dashboard includes brand settings, theme controls, storefront product visibility, and customer-facing product pages.",
  },
  {
    question: "Does it support operations after checkout?",
    answer:
      "Yes. Orders, payment status, inventory reservations, stock movement history, and notifications are connected for daily operations.",
  },
] as const;

export default function Home() {
  return (
    <main className="landing-page min-h-dvh overflow-hidden text-foreground">
      <HeroSection />
      <OutcomeSection />
      <ModuleSection />
      <WorkflowSection />
      <FAQSection />
      <CTASection />

      <style>{`
        @keyframes enter-up {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float-panel {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -10px, 0);
          }
        }

        @keyframes scan-line {
          0% {
            transform: translateX(-30%);
            opacity: 0.2;
          }
          50% {
            opacity: 0.65;
          }
          100% {
            transform: translateX(30%);
            opacity: 0.2;
          }
        }

        .landing-enter {
          animation: enter-up 620ms ease both;
        }

        .landing-float {
          animation: float-panel 7s ease-in-out infinite;
        }

        .landing-scan {
          animation: scan-line 6s ease-in-out infinite alternate;
        }

        .landing-page {
          background:
            linear-gradient(180deg, rgb(255 255 255 / 0.84), rgb(255 255 255 / 0.96)),
            linear-gradient(135deg, rgb(34 211 238 / 0.12), rgb(99 102 241 / 0.10), rgb(16 185 129 / 0.10));
        }

        .dark .landing-page {
          background:
            linear-gradient(180deg, rgb(2 6 23 / 0.88), rgb(2 6 23 / 0.96)),
            linear-gradient(135deg, rgb(34 211 238 / 0.14), rgb(99 102 241 / 0.16), rgb(16 185 129 / 0.12));
        }

        @keyframes liquid-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes liquid-glow {
          0% {
            transform: translate3d(-18%, -8%, 0) rotate(0deg);
            opacity: 0.35;
          }
          50% {
            transform: translate3d(12%, 8%, 0) rotate(6deg);
            opacity: 0.58;
          }
          100% {
            transform: translate3d(-18%, -8%, 0) rotate(0deg);
            opacity: 0.35;
          }
        }

        .glass-card {
          position: relative;
          overflow: hidden;
          border-color: color-mix(in srgb, currentColor 12%, transparent);
          background:
            linear-gradient(135deg, rgb(255 255 255 / 0.72), rgb(255 255 255 / 0.34)),
            linear-gradient(120deg, rgb(34 211 238 / 0.16), rgb(99 102 241 / 0.12), rgb(16 185 129 / 0.14));
          background-size: 100% 100%, 220% 220%;
          backdrop-filter: blur(18px) saturate(145%);
          box-shadow: 0 24px 80px rgb(15 23 42 / 0.08);
          animation: liquid-shift 14s ease-in-out infinite;
        }

        .dark .glass-card {
          background:
            linear-gradient(135deg, rgb(15 23 42 / 0.78), rgb(15 23 42 / 0.42)),
            linear-gradient(120deg, rgb(34 211 238 / 0.18), rgb(129 140 248 / 0.18), rgb(16 185 129 / 0.14));
          box-shadow: 0 24px 80px rgb(0 0 0 / 0.24);
        }

        .glass-card::before {
          content: "";
          position: absolute;
          inset: -35%;
          pointer-events: none;
          background:
            linear-gradient(115deg, transparent 20%, rgb(255 255 255 / 0.24) 42%, transparent 64%),
            linear-gradient(45deg, rgb(34 211 238 / 0.12), transparent 42%, rgb(16 185 129 / 0.12));
          filter: blur(18px);
          animation: liquid-glow 11s ease-in-out infinite;
        }

        .glass-card > * {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </main>
  );
}

function HeroSection() {
  return (
    <section className="relative isolate min-h-[760px] px-5 py-6 sm:px-8 lg:min-h-[820px]">
      <DashboardScene />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-foreground text-background">
            <Icon className="size-5" icon="gravity-ui:storefront" />
          </span>
          <span className="text-sm font-bold">Merchant Commerce Hub</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted sm:flex">
          <a href="#modules">Modules</a>
          <a href="#workflow">Workflow</a>
          <a href="#faq">FAQ</a>
        </nav>
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onPress={() => {
            window.location.href = "/auth/login";
          }}
        >
          Sign in
        </Button>
      </header>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-end pb-14 pt-28 sm:pt-36 lg:min-h-[690px]">
        <div className="max-w-3xl landing-enter">
          <Chip color="accent" size="sm" variant="soft">
            Commerce operating system
          </Chip>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-tight sm:text-7xl">
            Run products, stock, checkout, and storefronts from one clear
            system.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
            A client-ready merchant platform for teams that need daily commerce
            operations, branded storefront management, payment visibility, and
            reliable order flow without switching tools.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              className="h-12 px-6 font-bold"
              type="button"
              variant="primary"
              onPress={() => {
                window.location.href = "/auth/register";
              }}
            >
              Start workspace
              <Icon className="size-4" icon="gravity-ui:arrow-right" />
            </Button>
            <Button
              className="h-12 px-6"
              type="button"
              variant="secondary"
              onPress={() => {
                window.location.href = "/auth/login";
              }}
            >
              View dashboard
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardScene() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="landing-scan absolute inset-x-[-10%] top-28 h-px bg-accent/50" />
      <div className="absolute right-[-120px] top-24 hidden w-[820px] rotate-[-4deg] lg:block">
        <Card className="glass-card landing-float">
          <Card.Header className="flex items-center justify-between">
            <div>
              <Card.Title>Today’s commerce pulse</Card.Title>
              <Card.Description>Live operational snapshot</Card.Description>
            </div>
            <Chip color="success" size="sm" variant="soft">
              Live
            </Chip>
          </Card.Header>
          <Card.Content className="grid gap-4 p-5">
            <div className="grid grid-cols-3 gap-3">
              {metrics.map((metric) => (
                <Card
                  className="glass-card"
                  key={metric.label}
                  variant="secondary"
                >
                  <Card.Content className="p-4">
                    <p className="text-xs text-muted">{metric.label}</p>
                    <p className="mt-2 text-2xl font-bold">{metric.value}</p>
                  </Card.Content>
                </Card>
              ))}
            </div>
            <Card className="glass-card" variant="secondary">
              <Card.Content className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Checkout readiness</p>
                  <Chip color="success" size="sm" variant="soft">
                    Healthy
                  </Chip>
                </div>
                <div
                  aria-label="Checkout readiness"
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={84}
                  className="mt-4 h-2 overflow-hidden rounded-full bg-background"
                  role="progressbar"
                >
                  <div className="h-full w-[84%] rounded-full bg-success" />
                </div>
              </Card.Content>
            </Card>
            <div className="grid grid-cols-[1fr_0.8fr] gap-3">
              <Card className="glass-card" variant="secondary">
                <Card.Content className="space-y-3 p-4">
                  {[
                    "New order #1042",
                    "Stock reserved",
                    "Payment confirmed",
                  ].map((event) => (
                    <div
                      className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2 text-sm"
                      key={event}
                    >
                      <span>{event}</span>
                      <Icon
                        className="size-4 text-success"
                        icon="gravity-ui:circle-check"
                      />
                    </div>
                  ))}
                </Card.Content>
              </Card>
              <Card className="glass-card" variant="secondary">
                <Card.Content className="p-4">
                  <p className="text-sm font-semibold">Storefront theme</p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <span className="h-10 rounded-lg bg-accent" />
                    <span className="h-10 rounded-lg bg-success" />
                    <span className="h-10 rounded-lg bg-warning" />
                  </div>
                  <p className="mt-4 text-xs text-muted">Published 4m ago</p>
                </Card.Content>
              </Card>
            </div>
          </Card.Content>
        </Card>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-32 bg-background" />
    </div>
  );
}

function OutcomeSection() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          [
            "Faster launches",
            "Publish storefront-ready products and variants without waiting on engineering.",
          ],
          [
            "Cleaner operations",
            "Keep inventory, checkout, payments, and orders connected in one workflow.",
          ],
          [
            "Better client clarity",
            "Give merchant teams a dashboard that explains what needs action today.",
          ],
        ].map(([title, text], index) => (
          <Card
            className="glass-card landing-enter"
            key={title}
            style={{ animationDelay: `${index * 90}ms` }}
            variant="secondary"
          >
            <Card.Content className="p-5">
              <Chip color="accent" size="sm" variant="soft">
                0{index + 1}
              </Chip>
              <h2 className="mt-4 text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </Card.Content>
          </Card>
        ))}
      </div>
    </section>
  );
}

function ModuleSection() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8" id="modules">
      <div className="max-w-2xl">
        <Chip color="accent" size="sm" variant="soft">
          Business modules
        </Chip>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything a merchant client needs to operate the storefront.
        </h2>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => (
          <Card className="glass-card landing-enter" key={module.title}>
            <Card.Content className="p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-accent/10 text-accent">
                <Icon className="size-5" icon={module.icon} />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{module.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{module.text}</p>
            </Card.Content>
          </Card>
        ))}
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8" id="workflow">
      <Card className="glass-card">
        <Card.Content className="p-5 sm:p-7">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <Chip color="success" size="sm" variant="soft">
                Launch path
              </Chip>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                A practical workflow from setup to daily sales.
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted">
                The system is organized around the decisions merchant clients
                make every day: what to sell, what is available, where it is
                visible, and which orders need action.
              </p>
            </div>
            <div className="grid gap-3">
              {workflow.map((item, index) => (
                <Card
                  className="glass-card landing-enter"
                  key={item}
                  style={{ animationDelay: `${index * 80}ms` }}
                  variant="secondary"
                >
                  <Card.Content className="p-5">
                    <div className="flex items-start gap-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-foreground text-background font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="font-semibold">{item}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          {workflowCopy(item)}
                        </p>
                      </div>
                    </div>
                  </Card.Content>
                </Card>
              ))}
            </div>
          </div>
        </Card.Content>
      </Card>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16 sm:px-8" id="faq">
      <div className="text-center">
        <Chip color="accent" size="sm" variant="soft">
          Client questions
        </Chip>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          Clear enough for business users, structured enough for operators.
        </h2>
      </div>
      <div className="mt-8 grid gap-3">
        {faqs.map((item) => (
          <Card className="glass-card" key={item.question} variant="secondary">
            <Card.Content className="p-5">
              <h3 className="font-semibold">{item.question}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{item.answer}</p>
            </Card.Content>
          </Card>
        ))}
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-20 pt-8 sm:px-8">
      <Card className="glass-card overflow-hidden">
        <Card.Content className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Chip color="success" size="sm" variant="soft">
                Ready for client demos
              </Chip>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                Give merchant teams a system they can understand on day one.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Start with the dashboard, connect products and payments, then
                publish a storefront that matches the client brand.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="h-12 px-6 font-bold"
                type="button"
                variant="primary"
                onPress={() => {
                  window.location.href = "/auth/register";
                }}
              >
                Create account
              </Button>
              <Button
                className="h-12 px-6"
                type="button"
                variant="secondary"
                onPress={() => {
                  window.location.href = "/dashboard";
                }}
              >
                Open dashboard
              </Button>
            </div>
          </div>
          <Separator className="my-7" />
          <div className="grid gap-3 text-sm text-muted sm:grid-cols-3">
            <p>Role-aware dashboard access</p>
            <p>Storefront and checkout flows</p>
            <p>Inventory, order, and payment visibility</p>
          </div>
        </Card.Content>
      </Card>
    </section>
  );
}

function workflowCopy(item: (typeof workflow)[number]) {
  const copy: Record<(typeof workflow)[number], string> = {
    "Create catalog":
      "Add products, media, variants, price, SKU, and channel visibility in a structured catalog.",
    "Sync stock":
      "Review available stock, low-stock alerts, reservations, and recent movement history.",
    "Launch storefront":
      "Apply brand settings, publish storefront sections, and expose products to customers.",
    "Sell and fulfill":
      "Monitor checkout, payment status, order progress, customer details, and fulfillment actions.",
  };

  return copy[item];
}
