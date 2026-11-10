"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Reached from an invite or reset link. The user is already signed in by the link.
export default function SetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 10) return setError("Use at least 10 characters.");
    if (password !== String(form.get("confirm"))) return setError("The two passwords don't match.");
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }
    // Full page load so the Member Office (a separate page) opens cleanly.
    window.location.assign("/dashboard");
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <span className="brand">OliverFee <b className="text-[#bd1557]">360</b></span>
      <h1 className="mt-6 text-2xl font-bold">Choose your password</h1>
      <p className="mt-1 mb-4 text-sm text-[#625f69]">You&apos;ll use this with your email to sign in from now on.</p>
      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="password">New password</label>
          <input className="field" id="password" name="password" type="password" required autoComplete="new-password" />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Type it again</label>
          <input className="field" id="confirm" name="confirm" type="password" required autoComplete="new-password" />
        </div>
        {error && <p className="text-sm text-[#a11b51]">{error}</p>}
        <button className="btn w-full" disabled={pending}>{pending ? "Saving..." : "Save password"}</button>
      </form>
    </main>
  );
}
