import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthCard
      description="Sign in to manage your products, orders, and storefront."
      footer={
        <p className="text-muted">
          New to Merchant Hub?{" "}
          <Link
            className="font-semibold text-accent hover:underline"
            href="/auth/register"
          >
            Create an account
          </Link>
        </p>
      }
      title="Welcome back"
    >
      <LoginForm />
    </AuthCard>
  );
}
