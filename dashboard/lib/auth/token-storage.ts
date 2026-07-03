const ACCESS_TOKEN_KEY = "merchant-hub.access-token";
const MERCHANT_ID_KEY = "merchant-hub.merchant-id";
const REFRESH_TOKEN_KEY = "merchant-hub.refresh-token";
const SESSION_CHANGED_EVENT = "merchant-hub:session-changed";

function getStorage() {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

function notifySubscribers() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
  }
}

export const authTokenStorage = {
  getAccessToken() {
    return getStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
  },
  setAccessToken(token: string) {
    getStorage()?.setItem(ACCESS_TOKEN_KEY, token);
    notifySubscribers();
  },
  getMerchantId() {
    return getStorage()?.getItem(MERCHANT_ID_KEY) ?? null;
  },
  setMerchantId(merchantId: string) {
    getStorage()?.setItem(MERCHANT_ID_KEY, merchantId);
    notifySubscribers();
  },
  getRefreshToken() {
    return getStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
  },
  setSession(
    accessToken: string,
    merchantId: string | null,
    refreshToken?: string,
  ) {
    const storage = getStorage();

    storage?.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) storage?.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (merchantId) storage?.setItem(MERCHANT_ID_KEY, merchantId);
    else storage?.removeItem(MERCHANT_ID_KEY);
    notifySubscribers();
  },
  subscribe(callback: () => void) {
    if (typeof window === "undefined") return () => undefined;

    window.addEventListener(SESSION_CHANGED_EVENT, callback);
    window.addEventListener("storage", callback);

    return () => {
      window.removeEventListener(SESSION_CHANGED_EVENT, callback);
      window.removeEventListener("storage", callback);
    };
  },
  clear() {
    const storage = getStorage();

    storage?.removeItem(ACCESS_TOKEN_KEY);
    storage?.removeItem(MERCHANT_ID_KEY);
    storage?.removeItem(REFRESH_TOKEN_KEY);
    notifySubscribers();
  },
};
