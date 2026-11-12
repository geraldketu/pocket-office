"use server";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {requestsConfigured} from "@/lib/config";
import {designatedOwnerEmail,designatedOwnerIdentity,DESIGNATED_OWNER_ID} from "@/lib/admin/owner-account";
export async function ensureOwnerAccess():Promise<{owner:boolean;needsReview?:boolean;message?:string}>{
 const review=(message:string)=>({owner:false,needsReview:true,message});
 try{
  const auth=await createClient();const {data:{user},error}=await auth.auth.getUser();
  if(error||!user||!designatedOwnerEmail(user.email))return {owner:false};
  if(!designatedOwnerIdentity(user))return review("Your verified owner identity could not be confirmed. No access was changed.");
  if(!requestsConfigured())return review("Owner account verification is unavailable. Please retry.");
  const {data:profile,error:profileError}=await createAdminClient().from("profiles").select("id,email,role,carrier_id").eq("id",DESIGNATED_OWNER_ID).single();
  if(profileError||!profile||profile.id!==user.id||!designatedOwnerEmail(profile.email)||profile.role!=="admin"||profile.carrier_id)return review("Your owner profile needs review. No carrier checklist is required.");
  return {owner:true};
 }catch{return review("Owner access could not be checked. Please retry; no carrier checklist is required.");}
}
