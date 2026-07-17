import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@repo/ui/styles.css";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "POS",
  description: "Point-of-sale workspace for staff sales, cart, payments, and receipts.",
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
