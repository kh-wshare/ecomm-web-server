"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { ToastProvider } from "@heroui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { createQueryClient } from "@/lib/query/client";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const [queryClient] = React.useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <NextThemesProvider {...themeProps}>
        {children}
        <ToastProvider placement="top end" />
      </NextThemesProvider>
    </QueryClientProvider>
  );
}
