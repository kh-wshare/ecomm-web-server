import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  return (
    <AuthCard
      description="Choose a new secure password for your account."
      footer={
        <Link
          className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          href="/auth/login"
        >
          Back to sign in
        </Link>
      }
      title="Choose a new password"
    >
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
