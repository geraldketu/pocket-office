"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const errorText: Record<string, string> = {
  "no-carrier": "Your login isn't linked to a company yet. Please contact us.",
  "link-expired": "That link has expired or was already used. Ask us for a new one, or reset your password.",
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(errorText[params.get("error") ?? ""] ?? null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setError("Wrong email or password.");
      setPending(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="field" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input className="field" id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? "Signing in..." : "Sign in"}</button>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-blue-700 hover:underline">Forgot your password?</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <Link href="/" className="text-lg font-bold text-blue-800">Pocket Office</Link>
      <h1 className="mt-6 mb-4 text-2xl font-bold">Sign in</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
