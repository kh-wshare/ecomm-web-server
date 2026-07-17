"use client";

import { Button, Card, Chip, Icon, Separator } from "@repo/ui";

const storefrontAreas = [
  { label: "Catalog", value: "Product grid", icon: "solar:shop-bold-duotone" },
  { label: "Product detail", value: "Variant UX", icon: "solar:tuning-2-bold-duotone" },
  { label: "Checkout", value: "Order flow", icon: "solar:bill-list-bold-duotone" },
];

export default function StorefrontHome() {
  return (
    <main className="min-h-dvh px-6 py-8">
      <section className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <Chip color="warning" variant="soft">Public storefront</Chip>
            <h1 className="text-3xl font-semibold tracking-normal text-foreground md:text-5xl">
              Customer shopping surface for each merchant
            </h1>
            <p className="max-w-2xl text-base text-muted">
              First storefront micro-frontend shell for merchant slugs, product detail, cart, and checkout.
            </p>
          </div>
          <Button className="bg-primary text-white" size="lg">
            <Icon icon="solar:cart-plus-bold" width={20} />
            Preview store
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {storefrontAreas.map((item) => (
            <Card key={item.label} className="border border-separator bg-surface/85 shadow-none">
              <div className="flex gap-3 p-5">
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon icon={item.icon} width={22} />
                </span>
                <div>
                  <p className="text-sm text-muted">{item.label}</p>
                  <p className="text-lg font-semibold">{item.value}</p>
                </div>
              </div>
              <Separator />
              <div className="p-5">
                <p className="text-sm text-muted">
                  The public app is ready for route migration without direct imports from merchant admin.
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
