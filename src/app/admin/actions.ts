"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { inviteEmailHtml, sendEmail } from "@/lib/email";
import { ensureLogin, makeLink } from "@/lib/invites";
import { freshState } from "@/lib/oliverfee/office";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const str = (f: FormData, k: string, max = 200) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "carrier";

export type InviteResult = { ok: boolean; message: string; link?: string; carrierId?: string } | null;

// One click: create the carrier and its Member Office, make the email its owner, and send the sign-up link.
export async function createCarrierAndInvite(_prev: InviteResult, f: FormData): Promise<InviteResult> {
  await requireAdmin();
  const legal_name = str(f, "legal_name");
  const email = str(f, "email")?.toLowerCase() ?? null;
  if (!legal_name || !email) return { ok: false, message: "Company name and email are required." };

  const admin = createAdminClient();
  const dba = str(f, "dba");
  const { data: carrier, error: cErr } = await admin
    .from("carriers")
    .insert({
      legal_name, dba, usdot: str(f, "usdot", 20), mc: str(f, "mc", 20), phone: str(f, "phone", 40), email,
      tier: str(f, "tier"), slug: `${slugify(legal_name)}-${crypto.randomUUID().slice(0, 4)}`, status: "onboarding",
    })
    .select("id")
    .single();
  if (cErr || !carrier) return { ok: false, message: "Couldn't create carrier: " + cErr?.message };

  try {
    await admin.from("workspaces").insert({ carrier_id: carrier.id, state: freshState(dba || legal_name) });
    const { error } = await admin.from("carrier_members").insert({ carrier_id: carrier.id, email, role: "owner" });
    if (error) throw new Error(error.message);
    const outcome = await ensureLogin(email, dba || legal_name);
    revalidatePath("/admin");
    return {
      ok: true,
      carrierId: carrier.id,
      link: outcome.emailed ? undefined : outcome.link,
      message: outcome.existing
        ? `Created ${legal_name}. ${email} already has a login and will see this office next time they sign in.`
        : outcome.emailed
          ? `Created ${legal_name} and emailed the sign-up link to ${email}.`
          : `Created ${legal_name}. Email isn't set up yet, so copy this one-time link and text or email it to them:`,
    };
  } catch (e) {
    await admin.from("carriers").delete().eq("id", carrier.id);
    return { ok: false, message: "Couldn't create the login: " + (e instanceof Error ? e.message : String(e)) };
  }
}

// New one-time link for an owner whose invite expired or who forgot their password.
export async function resendInvite(_prev: InviteResult, f: FormData): Promise<InviteResult> {
  await requireAdmin();
  const carrierId = str(f, "carrier_id");
  const admin = createAdminClient();
  const { data: carrier } = await admin.from("carriers").select("legal_name, dba").eq("id", carrierId).single();
  const { data: owner } = await admin
    .from("carrier_members").select("email").eq("carrier_id", carrierId).eq("role", "owner").limit(1).maybeSingle();
  if (!carrier || !owner) return { ok: false, message: "No owner login found for this carrier." };
  try {
    const name = carrier.dba || carrier.legal_name;
    const { data: hasLogin } = await admin.from("profiles").select("id").eq("email", owner.email).maybeSingle();
    const { link } = await makeLink(owner.email, hasLogin ? "recovery" : "invite");
    const sent = await sendEmail(owner.email, "Your OliverFee 360 sign-in link", inviteEmailHtml(name, link));
    return {
      ok: true,
      link: sent ? undefined : link,
      message: sent ? `Sent a new link to ${owner.email}.` : `Email isn't set up yet. Copy this one-time link and send it to ${owner.email}:`,
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
