import type {
  PublicArticle,
  PublicProduct,
  PublicStorefront,
} from "@/types/storefront";
import { normalizeThemeConfig } from "@/lib/theme/theme-data";
import { ProductCard } from "@/components/storefront/product-card";
import {
  radiusValue,
  StorefrontShell,
} from "@/components/storefront/storefront-shell";

export function StorefrontHome({
  articles,
  products,
  storefront,
}: {
  articles: PublicArticle[];
  products: PublicProduct[];
  storefront: PublicStorefront;
}) {
  const config = normalizeThemeConfig(storefront.theme.config);
  const enabledSections = config.sections.filter((section) => section.enabled);

  return (
    <StorefrontShell config={config} merchant={storefront.merchant}>
      <main>
        {enabledSections.map((section) => {
          switch (section.type) {
            case "hero":
              return config.layout.showHero ? (
                <Hero
                  config={config}
                  key={section.id}
                  merchantName={storefront.merchant.name}
                />
              ) : null;
            case "productGrid":
              return (
                <ProductGrid
                  config={config}
                  key={section.id}
                  merchant={storefront.merchant}
                  products={products}
                  title="Shop all"
                />
              );
            case "featuredCollection":
              return (
                <ProductGrid
                  config={config}
                  key={section.id}
                  merchant={storefront.merchant}
                  products={storefront.featuredProducts.slice(0, 4)}
                  title={config.featuredCollection.title}
                />
              );
            case "socialFeed":
              return (
                <SocialFeed
                  articles={articles}
                  config={config}
                  key={section.id}
                  merchantSlug={storefront.merchant.slug}
                />
              );
            case "contactForm":
              return (
                <ContactSection
                  config={config}
                  email={storefront.merchant.email}
                  key={section.id}
                />
              );
            case "footer":
              return (
                <Footer
                  config={config}
                  key={section.id}
                  merchantName={storefront.merchant.name}
                />
              );
          }
        })}
      </main>
    </StorefrontShell>
  );
}

function Hero({
  config,
  merchantName,
}: {
  config: ReturnType<typeof normalizeThemeConfig>;
  merchantName: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <div
        className="relative isolate flex min-h-[440px] items-end overflow-hidden px-6 py-10 sm:min-h-[520px] sm:px-12 sm:py-14"
        style={{
          backgroundColor: config.colors.primary,
          backgroundImage: config.hero.imageUrl
            ? `linear-gradient(90deg, rgb(0 0 0 / 70%), rgb(0 0 0 / 12%)), url("${config.hero.imageUrl}")`
            : `linear-gradient(135deg, ${config.colors.primary}, ${config.colors.accent})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          borderRadius: radiusValue(config.layout.borderRadius),
          color: "#ffffff",
        }}
      >
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] opacity-75">
            {merchantName}
          </p>
          <h1
            className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl"
            style={{
              fontFamily: `${config.typography.headingFont}, ui-sans-serif, system-ui, sans-serif`,
            }}
          >
            {config.hero.title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 opacity-85 sm:text-lg">
            {config.hero.subtitle}
          </p>
          <a
            className="mt-8 inline-flex h-12 items-center rounded-full bg-white px-6 text-sm font-bold text-black"
            href="#products"
          >
            Explore products
          </a>
        </div>
      </div>
    </section>
  );
}

function ProductGrid({
  config,
  merchant,
  products,
  title,
}: {
  config: ReturnType<typeof normalizeThemeConfig>;
  merchant: PublicStorefront["merchant"];
  products: PublicProduct[];
  title: string;
}) {
  return (
    <section className={spacingClass(config.layout.spacing)} id="products">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p
              className="text-xs font-bold uppercase tracking-[0.2em]"
              style={{ color: config.colors.accent }}
            >
              Available now
            </p>
            <h2
              className="mt-2 text-3xl font-semibold tracking-tight"
              style={{
                fontFamily: `${config.typography.headingFont}, ui-sans-serif, system-ui, sans-serif`,
              }}
            >
              {title}
            </h2>
          </div>
          <p className="text-sm opacity-60">
            {products.length} product{products.length === 1 ? "" : "s"}
          </p>
        </div>
        {products.length ? (
          <div
            className={`grid gap-5 ${columnClass(config.layout.productGridColumns)}`}
          >
            {products.map((product) => (
              <ProductCard
                config={config}
                key={product.id}
                merchant={merchant}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div
            className="border px-6 py-16 text-center"
            style={{
              borderColor: `color-mix(in srgb, ${config.colors.text} 13%, transparent)`,
              borderRadius: radiusValue(config.layout.borderRadius),
            }}
          >
            <p className="font-semibold">The next collection is on its way</p>
            <p className="mt-2 text-sm opacity-60">
              There are no products published to this storefront right now.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function SocialFeed({
  articles,
  config,
  merchantSlug,
}: {
  articles: PublicArticle[];
  config: ReturnType<typeof normalizeThemeConfig>;
  merchantSlug: string;
}) {
  if (!articles.length) return null;

  return (
    <section className={spacingClass(config.layout.spacing)}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <h2
          className="text-3xl font-semibold tracking-tight"
          style={{
            fontFamily: `${config.typography.headingFont}, ui-sans-serif, system-ui, sans-serif`,
          }}
        >
          {config.socialFeed.title}
        </h2>
        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {articles.slice(0, 3).map((article) => (
            <article
              className="overflow-hidden border"
              key={article.id}
              style={{
                borderColor: `color-mix(in srgb, ${config.colors.text} 13%, transparent)`,
                borderRadius: radiusValue(config.layout.borderRadius),
              }}
            >
              <div
                className="aspect-[16/10] bg-black/5 bg-cover bg-center"
                style={
                  article.mediaUrls[0]
                    ? {
                        backgroundImage: `url("${article.mediaUrls[0]}")`,
                      }
                    : undefined
                }
              />
              <div className="p-5">
                <h3 className="font-semibold">{article.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 opacity-65">
                  {article.content}
                </p>
                <p
                  className="mt-4 text-xs font-bold uppercase tracking-wide"
                  style={{ color: config.colors.accent }}
                >
                  {merchantSlug} · Store story
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection({
  config,
  email,
}: {
  config: ReturnType<typeof normalizeThemeConfig>;
  email: string | null;
}) {
  return (
    <section className={spacingClass(config.layout.spacing)}>
      <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <h2
          className="text-3xl font-semibold"
          style={{
            fontFamily: `${config.typography.headingFont}, ui-sans-serif, system-ui, sans-serif`,
          }}
        >
          {config.contactForm.title}
        </h2>
        <p className="mt-3 opacity-65">
          Questions about a product or your order? We would love to help.
        </p>
        {email && (
          <a
            className="mt-6 inline-flex h-11 items-center rounded-full px-5 text-sm font-bold text-white"
            href={`mailto:${email}`}
            style={{ backgroundColor: config.colors.primary }}
          >
            Email our store
          </a>
        )}
      </div>
    </section>
  );
}

function Footer({
  config,
  merchantName,
}: {
  config: ReturnType<typeof normalizeThemeConfig>;
  merchantName: string;
}) {
  return (
    <footer
      className="mt-12 border-t px-5 py-10 text-center text-sm sm:px-8"
      style={{
        borderColor: `color-mix(in srgb, ${config.colors.text} 13%, transparent)`,
      }}
    >
      <p>{config.footer.text}</p>
      <p className="mt-2 text-xs opacity-50">© 2026 {merchantName}</p>
    </footer>
  );
}

function spacingClass(
  spacing: ReturnType<typeof normalizeThemeConfig>["layout"]["spacing"],
) {
  return {
    compact: "py-8",
    comfortable: "py-12 sm:py-16",
    spacious: "py-16 sm:py-24",
  }[spacing];
}

function columnClass(columns: number) {
  if (columns <= 2) return "sm:grid-cols-2";
  if (columns === 3) return "sm:grid-cols-2 lg:grid-cols-3";
  if (columns === 4) return "sm:grid-cols-2 lg:grid-cols-4";
  if (columns === 5) return "sm:grid-cols-2 lg:grid-cols-5";
  return "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6";
}
