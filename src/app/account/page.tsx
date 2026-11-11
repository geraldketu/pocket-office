import {redirect} from "next/navigation";
import {getProfile} from "@/lib/auth";
import {accountDestination} from "@/lib/account-flow";
import {AccountStatus} from "@/components/account-status";
export const dynamic="force-dynamic";
export default async function AccountPage(){const profile=await getProfile(),next=accountDestination(profile);if(next!=="/account")redirect(next);return <AccountStatus email={profile!.email} role={profile!.role}/>;}
