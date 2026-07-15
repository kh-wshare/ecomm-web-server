"use client";

import { toast } from "@heroui/react";

import { getErrorMessage } from "@/lib/errors/api-error";

export const notify = {
  error(error: unknown, fallback = "Something went wrong") {
    const message = getErrorMessage(error);

    return toast.danger(message || fallback);
  },
  info(message: string, description?: string) {
    return toast.info(message, { description });
  },
  success(message: string, description?: string) {
    return toast.success(message, { description });
  },
  warning(message: string, description?: string) {
    return toast.warning(message, { description });
  },
};
