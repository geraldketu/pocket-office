"use client";

import Link from "next/link";
import {ensureOwnerAccess} from "@/app/actions/owner-access";
import {usePreview} from "@/components/admin/preview-runtime";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authConfigured } from "@/lib/config";
import { Brand } from "@/components/site-shell";

const errorText: Record<string, string> = {
  "owner-required": "This administrative portal is restricted to the designated owner.",
  "unavailable": "Member sign-in is not open yet. You can browse the website without signing in.",
  "no-carrier": "Your login isn't linked to a company yet. Please contact us.",
  "link-expired": "That link has expired or was already used. Ask us for a new one, or reset your password.",
};

function LoginForm() {
  const router = useRouter();
  const preview=usePreview();const configured=preview?preview.scenario!=="unavailable":authConfigured();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {setError(errorText[new URLSearchParams(window.location.search).get("error") ?? ""] ?? null);},[]);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!configured) {setError("Member sign-in is not open yet. No account information was sent.");return;}
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    if(preview){try{await preview.call("login",{email:String(form.get("email")),password:String(form.get("password"))});preview.navigate("/dashboard");}catch{setError("Wrong email or password.");setPending(false);}return;}
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setError("Wrong email or password.");
      setPending(false);
      return;
    }
    try{
      const access=await ensureOwnerAccess();
      router.replace(access.owner?"/admin":access.needsReview?"/account":"/dashboard");
      router.refresh();
    }catch{setError("Your login succeeded, but workspace access could not be checked. Please try again.");setPending(false);}
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      {!configured && <p className="notice">Member sign-in is not open yet. Browse services or build a carrier checklist without an account.</p>}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="field" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input className="field" id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button className="btn w-full" disabled={pending || !configured}>{pending ? "Signing in..." : "Sign in with email"}</button>
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
      <nav className="auth-tabs" aria-label="Account navigation"><Link href="/login" aria-current="page">Sign in</Link><Link href="/signup">Create account</Link></nav>
      <span className="eyebrow">Owner & Staff Login</span>
      <h1 className="mt-3 mb-4">Welcome back.</h1>
      <p className="auth-copy">Use your OliverFee 360 email and password. Owners open the Admin Center; other accounts open only their permitted workspace. No ChatGPT account or matching ChatGPT email is required.</p>
      <p className="auth-copy">Invited owner or staff member? Open your private invitation email first to verify your address and choose a password. If your link expired, <Link className="text-link" href="/forgot-password">request a new password link</Link>.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
