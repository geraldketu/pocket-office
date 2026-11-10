import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "carrier" | "driver";

export type Profile = {
  id: string;
  email: string;
  role: Role;
  carrier_id: string | null;
  full_name: string | null;
};

// Returns the signed-in user's profile, or null if signed out.
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, email, role, carrier_id, full_name")
    .eq("id", user.id)
    .single();
  return (data as Profile) ?? null;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/#member");
  return profile;
}
