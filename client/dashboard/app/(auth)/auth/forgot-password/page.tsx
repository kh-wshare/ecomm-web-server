import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      description="Enter your account email to prepare a password recovery request."
      footer={
        <Link
          className="font-semibold text-accent hover:underline"
          href="/auth/login"
        >
          Back to sign in
        </Link>
      }
      title="Reset your password"
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
