"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requestsConfigured } from "@/lib/config";

export type ContactState = { ok: boolean; message: string } | null;

const clean = (v: FormDataEntryValue | null, max = 200) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

// Public contact form: creates a new lead in the admin dashboard.
export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  if (!requestsConfigured()) return {ok:false,message:"Online requests are not open yet. Your message was not submitted."};
  // Hidden field that bots tend to fill in.
  if (clean(formData.get("website"))) return { ok: true, message: "Thanks! We'll be in touch." };

  const name = clean(formData.get("name"));
  const phone = clean(formData.get("phone"), 40);
  const email = clean(formData.get("email"));
  if (!name || (!phone && !email)) {
    return { ok: false, message: "Please give us your name and a phone number or email." };
  }

  const { error } = await createAdminClient().from("leads").insert({
    name,
    phone: phone || null,
    email: email || null,
    company: clean(formData.get("company")) || null,
    usdot: clean(formData.get("usdot"), 20) || null,
    message: clean(formData.get("message"), 2000) || null,
    source: "website",
  });
  if (error) {
    console.error("contact form insert failed", error);
    return { ok: false, message: "Something went wrong. Please call us instead." };
  }
  return { ok: true, message: "Thanks! We'll call you within one business day." };
}
