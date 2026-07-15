import type { CheckoutContext } from "@/types/checkout";

const PREFIX = "merchant-hub.checkout.";

function storage() {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

export const checkoutStorage = {
  raw(sessionId: string) {
    return storage()?.getItem(`${PREFIX}${sessionId}`) ?? null;
  },

  get(sessionId: string): CheckoutContext | null {
    const value = this.raw(sessionId);
    if (!value) return null;

    try {
      return JSON.parse(value) as CheckoutContext;
    } catch {
      storage()?.removeItem(`${PREFIX}${sessionId}`);
      return null;
    }
  },

  set(sessionId: string, context: CheckoutContext) {
    storage()?.setItem(`${PREFIX}${sessionId}`, JSON.stringify(context));
  },
};
