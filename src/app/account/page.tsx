import {redirect} from "next/navigation";
import {getProfile} from "@/lib/auth";
import {accountDestination} from "@/lib/account-flow";
import {designatedOwnerEmail} from "@/lib/admin/owner-account";
import {createClient} from "@/lib/supabase/server";
import {AccountStatus} from "@/components/account-status";
export const dynamic="force-dynamic";
export default async function AccountPage(){
 const auth=await createClient(),{data:{user}}=await auth.auth.getUser();
 const profile=await getProfile();
 if(designatedOwnerEmail(user?.email)&&profile?.role!=="admin")return <AccountStatus email={user!.email!} role={profile?.role||"pending"} ownerRequested/>;
 const next=accountDestination(profile);if(next!=="/account")redirect(next);
 return <AccountStatus email={profile!.email} role={profile!.role}/>;
}
