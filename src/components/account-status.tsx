import Link from "next/link";
import {Brand} from "@/components/site-shell";
export function AccountStatus({email,role}:{email:string;role:string}){
 return <main className="auth-wrap"><Brand/><span className="eyebrow">Member Office</span><h1>Your account is ready.</h1><section className="card"><p>Signed in as <strong>{email}</strong>.</p><h2>Carrier access pending</h2><p>{role==="driver"?"Ask your carrier owner to link this login to your company's records.":"The office needs to link your login to your carrier records. Complete your carrier checklist so the team can review your setup."}</p><p>No subscription has been activated and no payment has been collected by creating this account.</p><Link className="btn" href="/carrier-setup">Complete carrier checklist ↗</Link></section><p><Link className="text-link" href="/plans">Review plans and services ↗</Link></p><form method="post" action="/auth/signout"><button className="btn-secondary">Sign out</button></form></main>;
}
