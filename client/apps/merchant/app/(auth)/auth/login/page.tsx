import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthCard
      description="Sign in to manage products, orders, payments, and storefront settings."
      footer={
        <p>
          New to Merchant Admin?{" "}
          <Link
            className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            href={{
              pathname: "/auth/register",
              query: next ? { next } : undefined,
            }}
          >
            Create an account
          </Link>
        </p>
      }
      title="Welcome back"
    >
      <LoginForm next={next} />
    </AuthCard>
  );
}
