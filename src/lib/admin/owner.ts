import "server-only";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {getProfile} from "@/lib/auth";
import {isOwner,labEnabled,LAB_OWNER} from "./policy";
import {labToken} from "./store";
export async function ownerIdentity(){
 if(labEnabled(process.env)&&(await cookies()).get("oliver-admin-lab")?.value===labToken())return LAB_OWNER;
 const profile=await getProfile();return isOwner(profile,process.env.OLIVERFEE_OWNER_IDS||"")?profile:null;
}
export async function requireOwner(){const owner=await ownerIdentity();if(!owner)redirect("/login?error=owner-required");return owner;}
export async function requireReadOnlyOwner(){await requireOwner();throw Error("Live administration is read-only in this version. Use an isolated preview for test changes.");}
