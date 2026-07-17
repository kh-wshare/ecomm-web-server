import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthCard
      description="Create your merchant workspace and owner account."
      footer={
        <p className="text-muted">
          Already have an account?{" "}
          <Link
            className="font-semibold text-accent hover:underline"
            href="/auth/login"
          >
            Sign in
          </Link>
        </p>
      }
      title="Start selling everywhere"
    >
      <RegisterForm />
    </AuthCard>
  );
}
