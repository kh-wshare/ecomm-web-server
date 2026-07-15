import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@repo/ui/styles.css";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Storefront",
  description: "Public storefront workspace for product discovery, cart, checkout, and order status.",
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en">
      <body className="min-h-dvh bg-slate-50 text-slate-950 antialiased dark:bg-zinc-950 dark:text-zinc-50">
        <Providers
          themeProps={{
            attribute: "class",
            defaultTheme: "system",
            enableSystem: true,
          }}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
