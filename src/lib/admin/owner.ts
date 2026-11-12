import "server-only";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {getProfile} from "@/lib/auth";
import {labEnabled,LAB_OWNER} from "./policy";
import {designatedOwnerIdentity,DESIGNATED_OWNER_ID,designatedOwnerEmail} from "./owner-account";
import {createAdminClient} from "@/lib/supabase/admin";
import {requestsConfigured} from "@/lib/config";
import {labToken} from "./store";
export async function ownerIdentity(){
 if(labEnabled(process.env)&&(await cookies()).get("oliver-admin-lab")?.value===labToken())return LAB_OWNER;
 const profile=await getProfile();
 if(!profile||profile.id!==DESIGNATED_OWNER_ID||profile.role!=="admin"||profile.carrier_id||!designatedOwnerEmail(profile.email)||!requestsConfigured())return null;
 try{
  const {data,error}=await createAdminClient().auth.admin.getUserById(profile.id);
  return !error&&designatedOwnerIdentity(data.user)?profile:null;
 }catch{return null;}
}
export async function requireOwner(){const owner=await ownerIdentity();if(!owner)redirect("/login?error=owner-required");return owner;}
export async function requireReadOnlyOwner(){await requireOwner();throw Error("Live administration is read-only in this version. Use an isolated preview for test changes.");}
