import { PaymentDetail } from "@/components/payments/payment-detail";

export default async function PaymentTransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PaymentDetail paymentId={id} />;
}
