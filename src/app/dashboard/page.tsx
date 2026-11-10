import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";

// Sends each user to the right home screen for their role.
export default async function DashboardRedirect() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  redirect(profile.role === "admin" ? "/admin" : "/#member");
}
