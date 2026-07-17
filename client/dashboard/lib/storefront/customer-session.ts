import type { AuthResult } from "@/types/auth";

const CUSTOMER_SESSION_KEY = "merchant-hub.storefront-customer";
const CUSTOMER_SESSION_CHANGED_EVENT =
  "merchant-hub:storefront-customer-changed";

let cachedRaw: string | null | undefined;
let cachedSession: AuthResult | null = null;

function getStorage() {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

function notifySubscribers() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CUSTOMER_SESSION_CHANGED_EVENT));
  }
}

export const storefrontCustomerSession = {
  clear() {
    getStorage()?.removeItem(CUSTOMER_SESSION_KEY);
    cachedRaw = null;
    cachedSession = null;
    notifySubscribers();
  },
  get() {
    const raw = getStorage()?.getItem(CUSTOMER_SESSION_KEY);
    if (!raw) {
      cachedRaw = null;
      cachedSession = null;
      return null;
    }
    if (raw === cachedRaw) return cachedSession;

    try {
      cachedRaw = raw;
      cachedSession = JSON.parse(raw) as AuthResult;
      return cachedSession;
    } catch {
      cachedRaw = raw;
      cachedSession = null;
      return null;
    }
  },
  set(session: AuthResult) {
    const raw = JSON.stringify(session);
    cachedRaw = raw;
    cachedSession = session;
    getStorage()?.setItem(CUSTOMER_SESSION_KEY, raw);
    notifySubscribers();
  },
  subscribe(callback: () => void) {
    if (typeof window === "undefined") return () => undefined;

    window.addEventListener(CUSTOMER_SESSION_CHANGED_EVENT, callback);
    window.addEventListener("storage", callback);

    return () => {
      window.removeEventListener(CUSTOMER_SESSION_CHANGED_EVENT, callback);
      window.removeEventListener("storage", callback);
    };
  },
};
