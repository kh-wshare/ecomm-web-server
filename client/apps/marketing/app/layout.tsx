import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@repo/ui/styles.css";
import "./marketing.css";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Systelst Commerce",
  description:
    "Marketing landing page for the Systelst commerce platform: merchant admin, storefront, POS, payments, inventory, and social selling.",
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en">
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <Providers
          themeProps={{
            attribute: "class",
            defaultTheme: "light",
            enableSystem: false,
          }}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
