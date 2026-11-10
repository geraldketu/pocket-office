"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authConfigured } from "@/lib/config";
import { Brand } from "@/components/site-shell";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(!authConfigured())return;
    setPending(true);
    const email = String(new FormData(e.currentTarget).get("email"));
    await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/set-password`,
    });
    // Always show the same message so we don't reveal which emails have accounts.
    setSent(true);
    setPending(false);
  }

  return (
    <main className="auth-wrap">
      <Brand/>
      {!authConfigured()&&<p className="notice">Password reset will be available when Member Office opens. <Link href="/" className="text-link">Return to the website</Link></p>}
      <h1 className="mt-6 mb-4 text-2xl font-bold">Reset your password</h1>
      {sent ? (
        <p className="card text-slate-700">If that email has an account, a reset link is on its way.</p>
      ) : (
        <form onSubmit={onSubmit} className="card space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="field" id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <button className="btn w-full" disabled={pending||!authConfigured()}>Send reset link</button>
        </form>
      )}
    </main>
  );
}
