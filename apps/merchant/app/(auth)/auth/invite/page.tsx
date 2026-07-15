import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { InvitationForm } from "@/components/auth/invitation-form";

export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  return (
    <AuthCard
      description="Complete your profile to join the merchant workspace."
      footer={
        <Link
          className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          href="/auth/login"
        >
          Already joined? Sign in
        </Link>
      }
      title="Accept your invitation"
    >
      <InvitationForm token={token} />
    </AuthCard>
  );
}
