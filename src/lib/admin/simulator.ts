import "server-only";
import {signupPayload} from "@/lib/account-flow";
import {randomUUID} from "node:crypto";
import {reviewInterview,type Interview} from "@/lib/interview-rules";
import {normalizeScreening} from "@/lib/screening";
import {fixtures} from "./fixtures";
import {PREVIEW_ROLES,TEST_PASSWORD,type PreviewRole} from "./policy";
import {logPreview,resetPreview,type PreviewSession} from "./store";
const fail=(message:string,status=400):never=>{throw Object.assign(Error(message),{status});};
export async function simulate(s:PreviewSession,op:string,input:Record<string,unknown>){
 const str=(key:string,max=1000)=>typeof input[key]==="string"?(input[key] as string).slice(0,max):"";
 const signed=()=>{if(!s.data.profile)fail("Sign in to a test account",403);};
 const owner=()=>{if(s.role!=="owner")fail("This test role is not the owner",403);};
 if(op==="reset"){resetPreview(s);return {ok:true};}
 if(op==="external"){logPreview(s,"blocked external navigation",str("destination"));return {ok:true};}
 if(op==="contact"){
  if(!str("name")||(!str("phone")&&!str("email")))return {ok:false,message:"Please give us your name and a phone number or email."};
  if(s.scenario==="save-error")return {ok:false,message:"Something went wrong. Please call us instead."};
  s.data.leads.push({id:"test-lead-"+randomUUID(),name:str("name"),company:str("company"),usdot:str("usdot"),phone:null,email:str("email"),source:"preview",status:"new",quoted_price:0,notes:"",message:str("message"),created_at:new Date().toISOString()});logPreview(s,"contact saved","Test-only lead; no outgoing message.");return {ok:true,message:"Thanks! We'll call you within one business day."};
 }
 if(op==="interview"){
  if(s.scenario==="save-error")return {ok:false,message:"Your request could not be saved. Download your review and try again later."};
  const raw=input.interview as Interview;if(!raw||!Array.isArray(raw.states)||typeof raw.company!=="string"||!raw.company.trim())return {ok:false,message:"Complete the carrier interview."};
  const data={...raw,...normalizeScreening(raw)},quote=reviewInterview(data);if(!quote.services.length&&!quote.bundleCents)return {ok:false,message:"Choose at least one service you need help with."};
  s.data.carrier.legal_name=data.company;s.data.carrier.status="onboarding";
  s.data.leads.unshift({id:"test-lead-"+randomUUID(),name:data.company,company:data.company,usdot:"",phone:null,email:str("email"),source:"carrier-interview",status:"new",quoted_price:0,notes:"",message:JSON.stringify({interview:data,review:quote}),created_at:new Date().toISOString()});
  logPreview(s,"interview saved",JSON.stringify({company:raw.company,quote,paymentStatus:"unpaid"}));return {ok:true,message:"Your carrier request was submitted for review. It is unpaid. No payment or filing has been submitted."};
 }
 if(op==="signup"){
  if(s.scenario==="signup-error"||s.scenario==="unavailable")fail("Account creation is currently unavailable. Please try again.",503);
  const payload=signupPayload(str("name",120),str("email",254),str("password",128),"https://preview.invalid");
  s.signupPending={email:payload.email,name:payload.options.data.full_name};
  const confirmationPath="/auth/confirm?token_hash=test-signup&type=signup&next=/account";
  logPreview(s,"simulated signup confirmation","Synthetic account for "+payload.email+". No Supabase account or email was created. "+confirmationPath);
  return {ok:true,needsConfirmation:true,confirmationPath};
 }
 if(op==="login"){
  if(s.signupPending&&str("email").toLowerCase()===s.signupPending.email&&str("password")===TEST_PASSWORD){s.role="new-customer";const events=s.data.events;s.data=fixtures("new-customer",s.scenario);s.data.events=events;s.data.profile={...s.data.profile!,carrier_id:null,email:s.signupPending.email};return {ok:true};}
  const email=str("email").toLowerCase(),role=PREVIEW_ROLES.find(r=>!r.startsWith("archive-")&&`${r.toLowerCase()}@example.test`===email);
  if(!role||role==="visitor"||role==="salesperson"||str("password")!==TEST_PASSWORD)fail("Wrong email or password",401);
  const events=s.data.events,leads=s.data.leads;s.role=role as PreviewRole;s.data=fixtures(role as PreviewRole,s.scenario);s.data.events=events;s.data.leads=leads;logPreview(s,"test sign-in",email);return {ok:true};
 }
 if(op==="signout"){s.role="visitor";s.data.profile=null;logPreview(s,"test sign-out","Owner authentication was not changed.");return {ok:true};}
 if(op==="password"){signed();if(s.scenario==="password-error")fail("Could not update password. Simulated auth service failure.");if(str("password").length<10)fail("Use at least 10 characters.");logPreview(s,"test password saved","Synthetic account only; no Supabase auth call.");return {ok:true};}
 if(op==="recovery"){logPreview(s,"simulated notification",`Recovery for ${str("email")}: /auth/confirm?token_hash=test-recovery&type=recovery&next=/set-password`);return {ok:true};}
 if(op==="upload"){
  signed();if(s.data.profile!.role!=="admin"&&(!s.data.profile!.carrier_id||input.carrierId!==s.data.profile!.carrier_id))fail("Another company's records are not available to this role",403);
  if(s.scenario==="storage-error")fail("Upload failed: simulated private storage failure");if(s.scenario==="save-error")fail("Couldn't save the document: simulated database failure");
  if(!s.data.types.some(t=>t.id===str("typeId")))fail("Choose a document type");
  const row={id:"test-doc-"+randomUUID(),carrier_id:str("carrierId"),type_id:str("typeId"),file_path:"test-only",file_name:str("fileName"),mime_type:"text/plain",issued_on:str("issued")||null,expires_on:str("expires")||null,status:"active",notes:str("notes"),created_at:new Date().toISOString()};s.data.docs.unshift(row);logPreview(s,"sample upload",row.file_name+" — generated sample content only, no live storage");return {ok:true,id:row.id};
 }
 if(op==="invite"){
  owner();if(s.scenario==="invite-error")return {ok:false,message:"That email already has a login. (Simulated duplicate/invite error.)"};
  const id=str("carrier_id")||"test-carrier-"+randomUUID();s.invitation={carrierId:id,name:str("legal_name")||"Sample invited carrier",email:str("email")||"new-customer@example.test"};logPreview(s,"simulated notification",`Invite ${s.invitation.email}: /auth/confirm?token_hash=test-invite&type=invite&next=/set-password`);return {ok:true,carrierId:id,link:`/admin/preview/${s.id}/view/auth/confirm?token_hash=test-invite&type=invite&next=/set-password`,message:"Test carrier/account created. Invitation delivery was simulated; use this test-only link."};
 }
 if(op==="addLead"){owner();s.data.leads.unshift({id:"test-lead-"+randomUUID(),name:str("name"),company:str("company"),usdot:str("usdot"),phone:null,email:"",source:str("source")||"preview",status:"new",quoted_price:0,notes:"",message:"",created_at:new Date().toISOString()});return {ok:true};}
 if(op==="updateLead"){owner();const row=s.data.leads.find(l=>l.id===str("id"));if(!row)fail("Test lead not found",404);row!.status=str("status");row!.notes=str("notes");row!.quoted_price=Number(str("quoted_price"))||0;return {ok:true};}
 if(op==="simulatePayment"){
  signed();
  if(s.role.startsWith("archive-")){
   const {legacySession,legacyCall}=await import("./legacy");const legacy=await legacySession(s);if(!legacy.quote)fail("Create and sign a test quote first.",409);
   const response=await legacyCall(s,`/api/carriers/${legacy.carrier}/quotes/${legacy.quote}`),quote=await response.json();
   if(!response.ok||quote.stale||!quote.signature||quote.snapshot?.blockers?.length)fail("The test quote must be current, fully priced and signed before a payment can be simulated.",409);
   legacy.sql.prepare("UPDATE quote_reviews SET status=?,paid_cents=? WHERE id=?").run("Ready to Process",quote.snapshot.dueTodayCents,legacy.quote);
  }
  logPreview(s,"SIMULATED PAYMENT","Test receipt TEST-"+randomUUID()+". No Stripe API call, no charge, no production payment update.");return {ok:true,paymentStatus:"simulated-paid",receipt:"TEST ONLY"};
 }
 if(op==="simulateDecline"){logPreview(s,"SIMULATED PAYMENT DECLINED","No payment occurred.");return {ok:true,paymentStatus:"unpaid"};}
 if(op==="simulateFiling"){signed();if(!s.data.events.some(e=>e.kind==="SIMULATED PAYMENT"))fail("Simulate full payment before processing.",409);logPreview(s,"SIMULATED FILING","Test record only. No government portal was contacted.");return {ok:true};}
 if(op==="simulateNotification"){logPreview(s,"SIMULATED NOTIFICATION","Test outbox only. No email, SMS or customer contact.");return {ok:true};}
 fail("Unsupported preview operation",404);
}
