import { redirect } from "next/navigation";
import {accountDestination} from "@/lib/account-flow";
import { getProfile } from "@/lib/auth";

// Sends each user to the right home screen for their role.
export default async function DashboardRedirect() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  redirect(accountDestination(profile));
}
