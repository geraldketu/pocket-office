import "server-only";
import { headers } from "next/headers";
import { inviteEmailHtml, sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

export async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

// One-time link that signs the person in and lands on "choose your password".
export async function makeLink(email: string, kind: "invite" | "recovery") {
  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: kind, email });
  if (error || !data) throw new Error(error?.message ?? "Could not create link");
  const link = `${await siteUrl()}/auth/confirm?token_hash=${data.properties.hashed_token}&type=${kind}&next=/set-password`;
  return { link, userId: data.user.id };
}

export type InviteOutcome = { link?: string; emailed: boolean; existing: boolean };

// Makes sure the email has a login. New people get an invite link (emailed when
// email is set up; otherwise the caller shows it to copy). People who already
// have a login need nothing new: they see the office the next time they sign in.
export async function ensureLogin(email: string, companyName: string): Promise<InviteOutcome> {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) return { existing: true, emailed: false };
  const { link } = await makeLink(email, "invite");
  const emailed = await sendEmail(email, "Your OliverFee 360 account is ready", inviteEmailHtml(companyName, link));
  return { link, emailed, existing: false };
}
