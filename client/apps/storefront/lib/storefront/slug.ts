const STOREFRONT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isStorefrontSlug(value: string) {
  return STOREFRONT_SLUG_PATTERN.test(value);
}
