import { redirect } from "next/navigation";
import {accountDestination} from "@/lib/account-flow";
import {representativeDestination} from "@/lib/sales/server";
import { getProfile } from "@/lib/auth";

// Sends each user to the right home screen for their role.
export default async function DashboardRedirect() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if(profile.role!=="admin"&&!profile.carrier_id){const sales=await representativeDestination(profile.id);if(sales)redirect(sales);}
  redirect(accountDestination(profile));
}
