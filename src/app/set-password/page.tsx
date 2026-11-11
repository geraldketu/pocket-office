"use client";

import {usePreview} from "@/components/admin/preview-runtime";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Brand } from "@/components/site-shell";

// Reached from an invite or reset link. The user is already signed in by the link.
export default function SetPasswordPage() {
  const router = useRouter();const preview=usePreview();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 10 || password.length > 128) return setError("Use at least 10 characters.");
    if (password !== String(form.get("confirm"))) return setError("The two passwords don't match.");
    setPending(true);
    setError(null);
    if(preview){try{await preview.call("password",{password});preview.navigate("/dashboard");}catch(e){setError(e instanceof Error?e.message:"Test password update failed");setPending(false);}return;}
    try {
      const {error}=await createClient().auth.updateUser({password});
      if(error)throw Error("This password link could not be used. Request a new link and try again.");
      router.replace("/dashboard");
      router.refresh();
    } catch(e) {
      setError(e instanceof Error?e.message:"Could not save your password. Please try again.");
    } finally {setPending(false);}
  }

  return (
    <main className="auth-wrap">
      <Brand/>
      <h1 className="mt-6 text-2xl font-bold">Choose your password</h1>
      <p className="mt-1 mb-4 text-sm text-slate-600">You&apos;ll use this with your email to sign in from now on.</p>
      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="password">New password</label>
          <input className="field" id="password" name="password" type="password" required autoComplete="new-password" minLength={10} maxLength={128} />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Type it again</label>
          <input className="field" id="confirm" name="confirm" type="password" required autoComplete="new-password" />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className="btn w-full" disabled={pending}>{pending ? "Saving..." : "Save password"}</button>
      </form>
    </main>
  );
}
