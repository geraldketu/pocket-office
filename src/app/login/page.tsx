"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authConfigured } from "@/lib/config";
import { Brand } from "@/components/site-shell";

const errorText: Record<string, string> = {
  "unavailable": "Member sign-in is not open yet. You can browse the website without signing in.",
  "no-carrier": "Your login isn't linked to a company yet. Please contact us.",
  "link-expired": "That link has expired or was already used. Ask us for a new one, or reset your password.",
};

function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {setError(errorText[new URLSearchParams(window.location.search).get("error") ?? ""] ?? null);},[]);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!authConfigured()) {setError("Member sign-in is not open yet. No account information was sent.");return;}
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
      {!authConfigured() && <p className="notice">Member sign-in is not open yet. Browse services or build a carrier checklist without an account.</p>}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="field" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input className="field" id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button className="btn w-full" disabled={pending || !authConfigured()}>{pending ? "Signing in..." : "Sign in with email"}</button>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-blue-700 hover:underline">Forgot your password?</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="auth-wrap">
      <Brand/>
      <span className="eyebrow">Private Member Office</span>
      <h1 className="mt-3 mb-4">Welcome back.</h1>
      <p className="auth-copy">Sign in with your email and password to access your carrier’s records. No ChatGPT account needed.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="auth-copy">New carrier? <Link className="text-link" href="/carrier-setup">Start your checklist ↗</Link></p>
    </main>
  );
}
