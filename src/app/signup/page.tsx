"use client";
import Link from "next/link";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {Brand} from "@/components/site-shell";
import {usePreview} from "@/components/admin/preview-runtime";
import {createClient} from "@/lib/supabase/client";
import {authConfigured} from "@/lib/config";
import {signupPayload} from "@/lib/account-flow";

export default function SignupPage(){
 const preview=usePreview(),router=useRouter(),configured=preview?preview.scenario!=="unavailable":authConfigured();
 const [pending,setPending]=useState(false),[error,setError]=useState<string|null>(null),[sent,setSent]=useState(false),[testLink,setTestLink]=useState<string|null>(null);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!configured||pending)return;setError(null);
  const form=new FormData(event.currentTarget);let payload:ReturnType<typeof signupPayload>;
  try{payload=signupPayload(String(form.get("name")||""),String(form.get("email")||""),String(form.get("password")||""),window.location.origin);if(payload.password!==form.get("confirm"))throw Error("The two passwords don't match.");}catch(e){setError(e instanceof Error?e.message:"Check your details.");return;}
  setPending(true);
  try{
   if(preview){const result=await preview.call("signup",{name:payload.options.data.full_name,email:payload.email,password:payload.password});setTestLink(typeof result.confirmationPath==="string"?result.confirmationPath:null);setSent(true);return;}
   const {data,error}=await createClient().auth.signUp(payload);
   if(error){if(error.code==="signup_disabled")throw Error("Account creation is currently unavailable. Please contact OliverFee 360.");if(error.status===429)throw Error("Too many requests. Please wait a moment and try again.");throw Error("Could not create your account. Please try again, or sign in if you already have an account.");}
   if(data.session){router.replace("/account");router.refresh();return;}setSent(true);
  }catch(e){setError(e instanceof Error?e.message:"Could not create your account. Please try again.");}finally{setPending(false);}
 }
 return <main className="auth-wrap"><Brand/><nav className="auth-tabs" aria-label="Account navigation"><Link href="/login">Sign in</Link><Link href="/signup" aria-current="page">Create account</Link></nav><span className="eyebrow">Member Office</span><h1>Create your account.</h1><p className="auth-copy">Use your email to get started with OliverFee 360. No ChatGPT account needed.</p>{sent?<section className="card" role="status"><h2>Check your inbox</h2><p>If this address can be registered, a confirmation link will arrive. Open it in the same browser to finish signing in.</p>{testLink&&<p><Link className="text-link" href={testLink}>Open test confirmation ↗</Link></p>}<p><Link className="btn-secondary" href="/login">Return to sign in</Link></p></section>:<form className="card signup-form" onSubmit={submit}>{!configured&&<p className="notice">Account creation is currently unavailable. Please try again later.</p>}<label><span className="label">Your name</span><input className="field" name="name" autoComplete="name" minLength={2} maxLength={120} required/></label><label><span className="label">Email</span><input className="field" name="email" type="email" autoComplete="email" maxLength={254} required/></label><label><span className="label">Password</span><input className="field" name="password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required/><small>At least 10 characters.</small></label><label><span className="label">Confirm password</span><input className="field" name="confirm" type="password" autoComplete="new-password" minLength={10} maxLength={128} required/></label>{error&&<p className="notice error" role="alert">{error}</p>}<button className="btn" disabled={pending||!configured}>{pending?"Creating account…":"Create account"}</button></form>}<p className="auth-copy">This creates a carrier/member account. The office links your carrier records after review. It does not grant admin access, activate a subscription, or collect payment.</p><p><Link className="text-link" href="/carrier-setup">Start your carrier checklist ↗</Link></p></main>;
}
