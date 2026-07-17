import { PaymentDetail } from "@/components/payments/payment-detail";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PaymentDetail paymentId={id} />;
}
