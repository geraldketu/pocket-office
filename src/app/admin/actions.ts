"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { inviteEmailHtml, sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const str = (f: FormData, k: string, max = 200) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "carrier";

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export type InviteResult = { ok: boolean; message: string; link?: string; carrierId?: string } | null;

// Builds a one-time sign-in link that lands on "choose your password".
async function makeLink(email: string, kind: "invite" | "recovery") {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: kind, email });
  if (error || !data) throw new Error(error?.message ?? "Could not create link");
  const link = `${await siteUrl()}/auth/confirm?token_hash=${data.properties.hashed_token}&type=${kind}&next=/set-password`;
  return { link, userId: data.user.id };
}

// One click: create the carrier, create their login, and send the welcome email.
export async function createCarrierAndInvite(_prev: InviteResult, f: FormData): Promise<InviteResult> {
  await requireAdmin();
  const legal_name = str(f, "legal_name");
  const email = str(f, "email")?.toLowerCase() ?? null;
  if (!legal_name || !email) return { ok: false, message: "Company name and email are required." };

  const admin = createAdminClient();
  const { data: carrier, error: cErr } = await admin
    .from("carriers")
    .insert({
      legal_name,
      dba: str(f, "dba"),
      usdot: str(f, "usdot", 20),
      mc: str(f, "mc", 20),
      phone: str(f, "phone", 40),
      email,
      tier: str(f, "tier"),
      slug: `${slugify(legal_name)}-${crypto.randomUUID().slice(0, 4)}`,
      status: "onboarding",
    })
    .select("id")
    .single();
  if (cErr || !carrier) return { ok: false, message: "Couldn't create carrier: " + cErr?.message };

  let link: string;
  try {
    const res = await makeLink(email, "invite");
    link = res.link;
    const { error: pErr } = await admin
      .from("profiles")
      .update({ role: "carrier", carrier_id: carrier.id })
      .eq("id", res.userId);
    if (pErr) throw new Error(pErr.message);
  } catch (e) {
    await admin.from("carriers").delete().eq("id", carrier.id);
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      message: msg.includes("already") ? "That email already has a login." : "Couldn't create the login: " + msg,
    };
  }

  const sent = await sendEmail(email, "Your OliverFee 360 account is ready", inviteEmailHtml(legal_name, link));
  revalidatePath("/admin");
  return {
    ok: true,
    carrierId: carrier.id,
    link,
    message: sent
      ? `Created ${legal_name} and emailed the invite to ${email}.`
      : `Created ${legal_name}. Email isn't set up yet, so copy this one-time link and text or email it to them:`,
  };
}

// New one-time link for a carrier whose invite expired or who forgot their password.
export async function resendInvite(_prev: InviteResult, f: FormData): Promise<InviteResult> {
  await requireAdmin();
  const carrierId = str(f, "carrier_id");
  const admin = createAdminClient();
  const { data: carrier } = await admin.from("carriers").select("legal_name").eq("id", carrierId).single();
  const { data: profile } = await admin.from("profiles").select("email").eq("carrier_id", carrierId).limit(1).maybeSingle();
  if (!carrier || !profile) return { ok: false, message: "No login found for this carrier." };
  try {
    const { link } = await makeLink(profile.email, "recovery");
    const sent = await sendEmail(profile.email, "Your Pocket Office sign-in link", inviteEmailHtml(carrier.legal_name, link));
    return {
      ok: true,
      link,
      message: sent ? `Sent a new link to ${profile.email}.` : "Email isn't set up yet. Copy this one-time link and send it to them:",
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

// Leads (row-level security already limits these to the admin; requireAdmin is a second check).
export async function addLead(f: FormData) {
  await requireAdmin();
  const name = str(f, "name");
  if (!name) return;
  const supabase = await createClient();
  await supabase.from("leads").insert({
    name,
    company: str(f, "company"),
    usdot: str(f, "usdot", 20),
    phone: str(f, "phone", 40),
    source: str(f, "source") ?? "dot-notice",
  });
  revalidatePath("/admin/leads");
}

export async function updateLead(f: FormData) {
  await requireAdmin();
  const id = str(f, "id");
  if (!id) return;
  const price = str(f, "quoted_price", 20);
  const supabase = await createClient();
  await supabase
    .from("leads")
    .update({
      status: str(f, "status") ?? "new",
      quoted_price: price ? Number(price.replace(/[$,]/g, "")) || null : null,
      notes: str(f, "notes", 4000),
    })
    .eq("id", id);
  revalidatePath("/admin/leads");
}
