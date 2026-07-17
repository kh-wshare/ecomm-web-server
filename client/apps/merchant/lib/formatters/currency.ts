export function formatCurrency(
  value: number | string,
  currency = "USD",
  locale = "en-US",
) {
  const amount = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(amount)) return "-";

  return new Intl.NumberFormat(locale, {
    currency: currency.toUpperCase(),
    style: "currency",
  }).format(amount);
}
