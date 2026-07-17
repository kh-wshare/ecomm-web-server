import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthCard
      description="Create your merchant workspace and owner account."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            href={{
              pathname: "/auth/login",
              query: next ? { next } : undefined,
            }}
          >
            Sign in
          </Link>
        </p>
      }
      title="Start selling"
    >
      <RegisterForm next={next} />
    </AuthCard>
  );
}
