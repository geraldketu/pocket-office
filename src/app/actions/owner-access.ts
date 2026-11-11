"use server";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {requestsConfigured} from "@/lib/config";
import {designatedOwnerEmail} from "@/lib/admin/owner-account";

export async function ensureOwnerAccess():Promise<{owner:boolean;needsReview?:boolean;message?:string}>{
 const review=(message:string)=>({owner:false,needsReview:true,message});
 try{
  const auth=await createClient();
  const {data:{user},error}=await auth.auth.getUser();
  if(error||!user||!designatedOwnerEmail(user.email))return {owner:false};
  if(!user.email_confirmed_at||user.is_anonymous)return review("Verify your owner email using its private confirmation link before opening the Admin Center.");
  if(!requestsConfigured())return review("Owner account setup is unavailable. Your login is for administration; no carrier checklist is required.");
  const ids=(process.env.OLIVERFEE_OWNER_IDS||"").split(",").map(x=>x.trim()).filter(Boolean);
  if(ids.length&&(ids.length!==1||ids[0]!==user.id))return review("The configured owner identity differs from this login. It must be reconciled securely; no carrier checklist is required.");
  const admin=createAdminClient();
  const {data:profile,error:profileError}=await admin.from("profiles").select("id,email,role,carrier_id").eq("id",user.id).single();
  if(profileError||!profile||!designatedOwnerEmail(profile.email))return review("The owner profile could not be verified. No carrier checklist is required.");
  if(profile.carrier_id||!["carrier","admin"].includes(profile.role))return review("This login has conflicting account records. Review those records before enabling owner access; do not complete a carrier checklist.");
  const {data:admins,error:adminsError}=await admin.from("profiles").select("id,email,role,carrier_id").eq("role","admin").limit(2);
  if(adminsError||!admins)return review("The existing owner records could not be verified. Please retry.");
  if(admins.length>1||admins.some(p=>p.id!==user.id||!designatedOwnerEmail(p.email)||p.carrier_id)){
   // This detail is returned only after the fixed owner email has been verified
   // with the provider. Never return administrator identities to other callers.
   const emails=admins.map(p=>p.email||"an account without a recorded email").join(", ");
   return review(`Existing administrator account: ${emails}. Your verified owner login cannot replace that account automatically. These owner records must be reconciled before the Admin Center can open.`);
  }
  if(profile.role==="admin")return admins.length===1?{owner:true}:review("The owner records changed while checking access. Please retry.");
  // Only the provider-verified, explicitly designated owner can complete initial
  // provisioning. No caller can supply an email, UUID, role, or company to assign.
  const {data:updated,error:updateError}=await admin.from("profiles").update({role:"admin"}).eq("id",user.id).eq("role","carrier").is("carrier_id",null).select("id").single();
  if(updateError||!updated)return review("Owner access could not be configured. Please retry; no carrier checklist is required.");
  return {owner:true};
 }catch{return review("Owner access could not be checked. Please retry; no carrier checklist is required.");}
}
