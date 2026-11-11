import {OwnerHeader} from "@/components/admin/owner-header";
import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import Home from "@/app/page";
import Plans from "@/app/plans/page";
import Setup from "@/app/carrier-setup/page";
import Bid from "@/app/bid-calculator/page";
import Login from "@/app/login/page";
import Forgot from "@/app/forgot-password/page";
import Password from "@/app/set-password/page";
import {SiteShell,PageHero} from "@/components/site-shell";
import {CarrierOffice} from "@/components/carrier-office";
import {SiteExplorer} from "@/components/admin/site-explorer";
import {OwnerOverview} from "@/components/admin/owner-overview";
import {CarrierDetailView} from "@/components/admin/carrier-detail";
import {LeadDesk} from "@/components/admin/lead-desk";
import {PreviewRuntime} from "@/components/admin/preview-runtime";
import {requireOwner} from "@/lib/admin/owner";
import {withPreview,logPreview} from "@/lib/admin/store";
import {previewAccess} from "@/lib/admin/policy";
import {fixtures} from "@/lib/admin/fixtures";
import {testOverview} from "@/lib/admin/overview";
export default async function View({params,searchParams}:{params:Promise<{id:string;path?:string[]}>;searchParams:Promise<Record<string,string|undefined>>}){
 const owner=await requireOwner(),p=await params;return withPreview(p.id,owner.id,async(s)=>{if(!s)notFound();
 const pathname="/"+(p.path||[]).join("/"),query=await searchParams,prefix=`/admin/preview/${s.id}/view`;
 if(pathname==="/app"&&s.role==="owner")redirect(prefix+"/admin");
 if(pathname==="/app"&&s.data.profile&&!s.data.profile.carrier_id)redirect(prefix+"/login?error=no-carrier");
 if(!previewAccess(s.role,pathname))redirect(prefix+"/login?error=owner-required");
 if(pathname==="/dashboard")redirect(prefix+(s.data.profile?s.data.profile.role==="admin"?"/admin":"/app":"/login"));
 if(pathname==="/auth/confirm"){
  if(["test-invite","test-recovery"].includes(query.token_hash||"")){if(query.token_hash==="test-invite"||!s.data.profile){const pending=s.data.carrier,leads=s.data.leads;s.role="new-customer";s.data={...fixtures("new-customer",s.scenario),events:s.data.events};s.data.leads=leads;if(pending.status==="onboarding")s.data.carrier.legal_name=pending.legal_name;if(s.invitation){s.data.carrier={...s.data.carrier,id:s.invitation.carrierId,legal_name:s.invitation.name};s.data.profile={...s.data.profile!,email:s.invitation.email,carrier_id:s.invitation.carrierId};}}logPreview(s,"test token accepted","No live auth token was exchanged.");redirect(prefix+"/set-password");}
  redirect(prefix+"/login?error=link-expired");
 }
 if(pathname.startsWith("/documents/"))redirect(`/admin/api/preview/${s.id}/file/${p.path?.[1]}${query.download?"?download=1":""}`);
 let content:React.ReactNode;
 if(pathname==="/")content=<Home/>;
 else if(pathname==="/plans")content=<Plans/>;
 else if(pathname==="/carrier-setup")content=<Setup/>;
 else if(pathname==="/bid-calculator")content=<Bid/>;
 else if(pathname==="/login")content=<Login/>;
 else if(pathname==="/forgot-password")content=<Forgot/>;
 else if(pathname==="/set-password")content=<Password/>;
 else if(pathname==="/app")content=<CarrierOffice profile={{email:s.data.profile!.email,carrier_id:s.data.profile!.carrier_id!}} carrier={s.data.carrier} types={s.data.types} docs={s.data.docs}/>;
 else if(pathname==="/admin")content=<SiteExplorer/>;
 else if(pathname==="/admin/api/coverage")content=<section className="card"><h1>Verified preview coverage</h1><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{fs.readFileSync(path.join(process.cwd(),"docs/ADMIN-PREVIEW-COVERAGE.json"),"utf8")}</pre></section>;
 else if(pathname==="/admin/overview"){
  const data=testOverview(s.scenario);if(s.scenario==="database-error")for(const m of data.modules){m.rows=[];m.error="This module could not be read. Simulated schema/access failure; no changes were made.";}if(s.invitation)data.modules.find(m=>m.name==="carriers")!.rows.push({...s.data.carrier,id:s.invitation.carrierId,legal_name:s.invitation.name});data.modules.find(m=>m.name==="leads")!.rows=s.data.leads;data.modules.find(m=>m.name==="documents")!.rows=s.data.docs;content=<OwnerOverview data={data} preview/>;
 }
 else if(pathname==="/admin/leads")content=<LeadDesk status={query.status} leads={s.data.leads.filter(l=>!query.status||l.status===query.status)}/>;
 else if(pathname.startsWith("/admin/carriers/")){if(p.path?.[2]!==s.data.carrier.id&&p.path?.[2]!==s.invitation?.carrierId)notFound();const carrier=p.path?.[2]===s.invitation?.carrierId?{...s.data.carrier,id:s.invitation!.carrierId,legal_name:s.invitation!.name}:s.data.carrier;content=<CarrierDetailView carrier={carrier} types={s.data.types} docs={s.data.docs} logins={[{email:"basic@example.test"}]} readOnly={false}/>;}
 else if(pathname==="/archive")content=<iframe className="archive-iframe" title="Original archived Worker screens" src={`/admin/api/preview/${s.id}/archive/index.html?${new URLSearchParams({screen:query.screen||"member",...(query.carrier?{carrier:query.carrier}:{}),...(query.quote?{quote:query.quote}:{})}).toString()}`} sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"/>;
 else if(pathname==="/auth/signout")content=<SiteShell><PageHero eyebrow="POST workflow" title="Sign out of the test account."><p>The live endpoint accepts POST only. Open the customer vault and use its real Sign out button; the preview simulates that POST.</p></PageHero><Link className="btn" href="/app">Open customer vault</Link></SiteShell>;
 else if(pathname==="/admin-lab")content=<SiteShell><h1>Local owner lab</h1><p>You are already in the isolated lab. The outer /admin-lab login is a development setup screen, not a customer role page.</p><Link className="btn" href="/admin">Open Site Explorer as test owner</Link></SiteShell>;
 else if(["/signup","/checkout","/checkout/confirmation","/sales"].includes(pathname))content=<SiteShell><PageHero eyebrow="Missing from live app" title="This workflow is not implemented."><p>{pathname} has no live route. No production screen is fabricated here.</p></PageHero><section className="card"><h2>Follow the existing journey</h2><p>Homepage → carrier checklist → unpaid request → owner invitation → choose password → customer vault. Payment and notification outcomes can be exercised with the explicitly labelled simulator controls above.</p><div className="form-actions"><Link className="btn" href="/">Start at homepage</Link><Link className="btn-secondary" href="/carrier-setup">Carrier checklist</Link><Link className="btn-secondary" href="/auth/confirm?token_hash=test-invite&type=invite&next=/set-password">Open sample invitation</Link></div></section></SiteShell>;
 else notFound();
 return <PreviewRuntime id={s.id} role={s.role} scenario={s.scenario}>{pathname.startsWith("/admin")&&s.role==="owner"&&<OwnerHeader email={s.data.profile!.email}/>} {content}</PreviewRuntime>;
});
}