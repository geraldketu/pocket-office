import "server-only";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {getProfile} from "@/lib/auth";
import {isOwner,isVerifiedSoleOwner,labEnabled,LAB_OWNER} from "./policy";
import {createAdminClient} from "@/lib/supabase/admin";
import {requestsConfigured} from "@/lib/config";
import {labToken} from "./store";
export async function ownerIdentity(){
 if(labEnabled(process.env)&&(await cookies()).get("oliver-admin-lab")?.value===labToken())return LAB_OWNER;
 const profile=await getProfile(),ids=process.env.OLIVERFEE_OWNER_IDS?.trim();
 if(ids)return isOwner(profile,ids)?profile:null;
 if(!profile||profile.role!=="admin"||!requestsConfigured())return null;
 try{
  const client=createAdminClient();
  const {data:admins,error}=await client.from("profiles").select("id,email,role,carrier_id").eq("role","admin").limit(2);
  if(error||!admins||admins.length!==1)return null;
  const {data,error:authError}=await client.auth.admin.getUserById(profile.id);
  const email=!authError&&data.user?.email_confirmed_at?data.user.email||null:null;
  return isVerifiedSoleOwner(profile,admins,email)?profile:null;
 }catch{return null;}
}
export async function requireOwner(){const owner=await ownerIdentity();if(!owner)redirect("/login?error=owner-required");return owner;}
export async function requireReadOnlyOwner(){await requireOwner();throw Error("Live administration is read-only in this version. Use an isolated preview for test changes.");}
