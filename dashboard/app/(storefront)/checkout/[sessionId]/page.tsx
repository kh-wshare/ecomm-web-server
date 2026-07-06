import { CheckoutPage } from "@/components/checkout/checkout-page";

export default async function CheckoutRoute({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <CheckoutPage sessionId={sessionId} />;
}
