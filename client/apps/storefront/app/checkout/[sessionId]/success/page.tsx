import { CheckoutSuccess } from "@/components/checkout/checkout-success";

export default async function CheckoutSuccessRoute({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <CheckoutSuccess sessionId={sessionId} />;
}
