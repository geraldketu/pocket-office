// OliverFee 360 Member Office API (ported from Felicia's Sites worker).
// Identity comes from the Supabase login. Nothing the browser sends about
// roles or carriers is trusted: every request re-checks membership here.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from "next/server";
import { ensureLogin } from "@/lib/invites";
import {
  ALLOWED_MIME, HttpError, MAX_FILE_BYTES, ROLES, canonical, cleanState, driverState, fail,
  freshState, safeSelection, validId, type State,
} from "@/lib/oliverfee/office";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "carrier-files";
type User = { id: string; email: string; admin: boolean };
type Access = { id: string; name: string; role: string; person_id: string | null; admin?: boolean };

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });

async function identity(): Promise<User> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) fail(401, "Sign in to open your Member Office.");
  const { data: profile } = await createAdminClient().from("profiles").select("role").eq("id", user!.id).maybeSingle();
  return { id: user!.id, email: user!.email!.toLowerCase(), admin: profile?.role === "admin" };
}

async function bodyJSON(req: NextRequest, max = 900000) {
  const text = await req.text();
  if (text.length > max) fail(413, "Workspace too large.");
  try { return JSON.parse(text); } catch { return fail(400, "Invalid JSON."); }
}

async function authorize(user: User, carrierId: string, write = false, ownerOnly = false): Promise<Access> {
  const db = createAdminClient();
  if (!/^[0-9a-f-]{36}$/i.test(carrierId)) fail(404, "Carrier not found.");
  const { data: carrier } = await db.from("carriers").select("id, legal_name, dba").eq("id", carrierId).maybeSingle();
  if (!carrier) fail(404, "Carrier not found.");
  const base = { id: carrier!.id, name: carrier!.dba || carrier!.legal_name };
  if (user.admin) return { ...base, role: "owner", person_id: null, admin: true };
  let { data: m } = await db.from("carrier_members").select("role, person_id")
    .eq("carrier_id", carrierId).eq("user_id", user.id).maybeSingle();
  if (!m) {
    // An invitation to this email that hasn't been linked to a login yet (e.g. opened straight from a link).
    const { data: invited } = await db.from("carrier_members").update({ user_id: user.id })
      .eq("carrier_id", carrierId).eq("email", user.email).is("user_id", null).select("role, person_id");
    m = invited?.[0] ?? null;
  }
  if (!m) fail(403, "You do not have access to this carrier.");
  if (write && m!.role === "driver") fail(403, "Drivers can upload their own files but cannot edit carrier administration.");
  if (ownerOnly && m!.role !== "owner") fail(403, "Only a carrier owner can manage account access.");
  return { ...base, role: m!.role, person_id: m!.person_id };
}

const audit = (carrierId: string, user: User, action: string) =>
  createAdminClient().from("office_audit").insert({ carrier_id: carrierId, user_id: user.id, action });

async function quoteResponse(row: any, state: State) {
  const current = await canonical(state, row.selection);
  const stale = row.input_hash !== current.hash;
  return {
    id: row.id, snapshot: row.snapshot,
    status: stale ? "Changed — new signature required" : row.status,
    signature: row.signature, signedAt: row.signed_at, stale,
    checkoutConfigured: !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_CHECKOUT_ENABLED === "true",
    paidCents: row.paid_cents,
  };
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "carrier";

async function api(req: NextRequest, parts: string[]) {
  const db = createAdminClient();
  const url = req.nextUrl;
  const path = "/" + parts.join("/");

  // The posted diesel price is public information, so the bid calculator works signed out.
  if (path === "/national-diesel-rate" && req.method === "GET") {
    const { data } = await db.from("national_diesel_rate").select("price, rate_date").eq("id", 1).maybeSingle();
    return json({ rate: data ? { price: Number(data.price), date: data.rate_date } : null });
  }

  // Website contact form: creates a lead for the admin.
  if (path === "/contact" && req.method === "POST") {
    const b = await bodyJSON(req, 5000);
    const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    if (clean(b.website)) return json({ ok: true });
    const name = clean(b.name), phone = clean(b.phone, 40), email = clean(b.email);
    if (!name || (!phone && !email)) fail(400, "Please give us your name and a phone number or email.");
    const { error } = await db.from("leads").insert({
      name, phone: phone || null, email: email || null, company: clean(b.company) || null,
      usdot: clean(b.usdot, 20) || null, message: clean(b.message, 2000) || null, source: "website",
    });
    if (error) fail(500, "Something went wrong. Please call us instead.");
    return json({ ok: true }, 201);
  }

  const user = await identity();
  if (!["GET", "HEAD"].includes(req.method) && req.headers.get("origin") !== url.origin)
    fail(403, "Same-origin request required.");

  if (path === "/national-diesel-rate" && req.method === "PUT") {
    if (!user.admin) fail(403, "Only the OliverFee 360 administrator can post the national diesel rate.");
    const { price, date } = await bodyJSON(req, 300);
    const ts = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(date) : NaN;
    if (!Number.isFinite(price) || price < 0.001 || price > 99.999 || !Number.isFinite(ts) ||
      new Date(ts).toISOString().slice(0, 10) !== date || ts > Date.now())
      fail(400, "Enter a valid diesel price and a source date up to today.");
    const { data: cur } = await db.from("national_diesel_rate").select("rate_date").eq("id", 1).maybeSingle();
    if (cur && cur.rate_date > date) fail(409, "A rate with a newer source date is already posted.");
    const rounded = Math.round(price * 1000) / 1000;
    await db.from("national_diesel_rate").upsert({ id: 1, price: rounded, rate_date: date });
    return json({ rate: { price: rounded, date } });
  }

  if (path === "/session" && req.method === "GET") {
    // Link any office invitations sent to this email to the signed-in login.
    await db.from("carrier_members").update({ user_id: user.id }).eq("email", user.email).is("user_id", null);
    let carriers: { id: string; name: string; role: string }[];
    if (user.admin) {
      const { data } = await db.from("carriers").select("id, legal_name, dba").order("created_at", { ascending: false });
      carriers = (data ?? []).map((c) => ({ id: c.id, name: c.dba || c.legal_name, role: "owner" }));
    } else {
      const { data } = await db.from("carrier_members").select("role, carriers(id, legal_name, dba, created_at)").eq("user_id", user.id);
      carriers = (data ?? []).filter((m: any) => m.carriers)
        .sort((a: any, b: any) => (b.carriers.created_at > a.carriers.created_at ? 1 : -1))
        .map((m: any) => ({ id: m.carriers.id, name: m.carriers.dba || m.carriers.legal_name, role: m.role }));
    }
    return json({ user: { email: user.email, admin: user.admin }, carriers, checkout: "coming_soon" });
  }

  if (path === "/carriers" && req.method === "POST") {
    const { name } = await bodyJSON(req, 300);
    if (typeof name !== "string" || !name.trim() || name.length > 120) fail(400, "Enter a company name under 120 characters.");
    const { data: c, error } = await db.from("carriers").insert({
      legal_name: name.trim(), slug: `${slugify(name)}-${crypto.randomUUID().slice(0, 4)}`, status: "onboarding",
    }).select("id").single();
    if (error || !c) fail(500, "Could not create the office.");
    await db.from("carrier_members").insert({ carrier_id: c!.id, email: user.email, user_id: user.id, role: "owner" });
    await db.from("workspaces").insert({ carrier_id: c!.id, state: freshState(name.trim()) });
    return json({ id: c!.id, name: name.trim() }, 201);
  }

  if (parts[0] !== "carriers" || !parts[1]) fail(404, "Not found.");
  const id = parts[1], resource = parts[2];
  const access = await authorize(user, id);
  let { data: stored } = await db.from("workspaces").select("state, revision").eq("carrier_id", id).maybeSingle();
  if (!stored) {
    // Carriers created before the merge get an empty office on first open.
    stored = { state: freshState(access.name), revision: 0 };
    await db.from("workspaces").insert({ carrier_id: id, ...stored });
  }
  const state: State = stored.state;

  if (resource === "workspace" && req.method === "GET") {
    const data: State = access.role === "driver" ? driverState(state, access.person_id) : { ...state };
    let fq = db.from("office_files").select("*").eq("carrier_id", id).order("created_at", { ascending: false });
    if (access.role === "driver") fq = fq.eq("person_id", access.person_id ?? "");
    const { data: files } = await fq;
    data.docs = (files ?? []).map((f) => ({ id: f.id, name: f.name, date: f.expires_on, record: f.record_id, purpose: f.purpose, person: f.person_id }));
    if (access.role !== "driver") {
      const { data: reviews } = await db.from("quote_reviews").select("*").eq("carrier_id", id).order("created_at", { ascending: false });
      data.quoteOrders = await Promise.all((reviews ?? []).map((r) => quoteResponse(r, state)));
    }
    return json({ state: data, revision: stored.revision, role: access.role, personId: access.person_id || null });
  }

  if (resource === "workspace" && req.method === "PUT") {
    await authorize(user, id, true);
    const body = await bodyJSON(req);
    const next = cleanState(body.state, state);
    if (!Number.isInteger(body.revision) || body.revision !== stored.revision)
      fail(409, "Another session changed this office. Reload before saving.");
    const { data: updated } = await db.from("workspaces").update({ state: next, revision: body.revision + 1 })
      .eq("carrier_id", id).eq("revision", body.revision).select("carrier_id");
    if (updated?.length !== 1) fail(409, "This office changed. Reload before saving.");
    await audit(id, user, "workspace.updated");
    return json({ revision: body.revision + 1 });
  }

  if (resource === "quotes") {
    if (access.role === "driver") fail(403, "Drivers cannot access carrier quotes.");
    if (req.method === "POST" && !parts[3]) {
      const body = await bodyJSON(req, 1000);
      const selection = safeSelection(body.selection);
      const current = await canonical(state, selection);
      const { data: q } = await db.from("quote_reviews").insert({
        carrier_id: id, snapshot: current.snapshot, selection, input_hash: current.hash,
        status: "Awaiting Signature", created_by: user.id,
      }).select("id").single();
      await audit(id, user, "quote.created");
      return json({ id: q!.id, path: "/?carrier=" + id + "&quote=" + q!.id + "#customer-review" }, 201);
    }
    const quoteId = parts[3] || "";
    if (!/^[0-9a-f-]{36}$/i.test(quoteId)) fail(404, "Quote not found.");
    const { data: row } = await db.from("quote_reviews").select("*").eq("carrier_id", id).eq("id", quoteId).maybeSingle();
    if (!row) fail(404, "Quote not found.");
    const current = await canonical(state, row!.selection);
    if (req.method === "GET") return json(await quoteResponse(row, state));

    if (parts[4] === "sign" && req.method === "POST") {
      const body = await bodyJSON(req, 2000);
      if (current.hash !== row!.input_hash) fail(409, "The estimate changed. Ask staff for a new review link.");
      if (current.snapshot.blockers.length) fail(409, "Resolve payable Pending fees before finalization.");
      if (body.acknowledged !== true || typeof body.signature !== "string" || !body.signature.trim() || body.signature.length > 120)
        fail(400, "Acknowledgment and customer signature are required.");
      if (row!.signature) fail(409, "This quote version is already signed.");
      await db.from("quote_reviews").update({
        signature: body.signature.trim(), signed_at: new Date().toISOString(), signed_by: user.id, status: "Signed — Awaiting Payment",
      }).eq("id", row!.id).is("signature", null);
      await audit(id, user, "quote.signed");
      return json({ status: "Signed — Awaiting Payment" });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (parts[4] === "checkout" && req.method === "POST") {
      if (!stripeKey || process.env.STRIPE_CHECKOUT_ENABLED !== "true") fail(503, "Live checkout coming soon.");
      if (!row!.signature || current.hash !== row!.input_hash || current.snapshot.blockers.length || row!.status !== "Signed — Awaiting Payment")
        fail(409, "A current signed and fully priced quote is required.");
      const q = current.snapshot;
      const back = url.origin + "/?carrier=" + id + "&quote=" + row!.id + "#customer-review";
      const form = new URLSearchParams({
        mode: q.plan ? "subscription" : "payment", success_url: back, cancel_url: back,
        "metadata[quote_id]": row!.id, "metadata[carrier_id]": id,
      });
      let i = 0;
      for (const [name, amount, recurring] of [
        ["OliverFee one-time services and collected outside fees", q.payableCents, false],
        [q.plan + " monthly membership", q.monthlyCents, true],
      ] as [string, number, boolean][]) {
        if (amount > 0) {
          const p = "line_items[" + i + "]";
          form.set(p + "[quantity]", "1");
          form.set(p + "[price_data][currency]", "usd");
          form.set(p + "[price_data][unit_amount]", String(amount));
          form.set(p + "[price_data][product_data][name]", name);
          if (recurring) form.set(p + "[price_data][recurring][interval]", "month");
          i++;
        }
      }
      const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: { Authorization: "Bearer " + stripeKey, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": row!.id + ":" + row!.input_hash },
        body: form,
      });
      const session = await r.json();
      if (!r.ok || !session.url) fail(502, "Checkout could not be created.");
      await db.from("quote_reviews").update({ checkout_session: session.id }).eq("id", row!.id);
      return json({ url: session.url });
    }

    if (parts[4] === "confirm" && req.method === "POST") {
      if (!stripeKey || !row!.checkout_session || !row!.signature) fail(409, "No signed checkout is awaiting confirmation.");
      const r = await fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(row!.checkout_session), {
        headers: { Authorization: "Bearer " + stripeKey },
      });
      const session = await r.json();
      if (!r.ok) fail(502, "Stripe confirmation unavailable.");
      if (session.payment_status !== "paid") return json({ status: row!.status });
      if (current.hash !== row!.input_hash || current.snapshot.blockers.length || session.currency !== "usd" ||
        session.amount_total !== current.snapshot.dueTodayCents || session.metadata?.quote_id !== row!.id || session.metadata?.carrier_id !== id)
        fail(409, "Full current quote payment is not confirmed.");
      const status = current.snapshot.outside.some((x: any) => x.payer !== "OliverFee collects" && (x.amountCents === null || x.amountCents > 0))
        ? "Paid — direct-pay proof needed" : "Ready to Process";
      await db.from("quote_reviews").update({ status, paid_cents: session.amount_total }).eq("id", row!.id);
      return json({ status });
    }
  }

  if (resource === "members") {
    await authorize(user, id, true, true);
    if (req.method === "GET") {
      const { data } = await db.from("carrier_members").select("email, role, person_id, user_id").eq("carrier_id", id);
      return json((data ?? []).map((m) => ({ email: m.email, role: m.role, person_id: m.person_id, active: !!m.user_id })));
    }
    if (req.method === "POST") {
      const m = await bodyJSON(req, 1000);
      const email = typeof m.email === "string" ? m.email.trim().toLowerCase() : "";
      if (!email || !/^\S+@\S+\.\S+$/.test(email) || !ROLES.includes(m.role)) fail(400, "Valid email and role required.");
      if (m.role === "driver" && !(state.people || []).some((p: any) => p.id === m.personId && p.role === "Driver"))
        fail(400, "Link the driver account to an existing driver.");
      const { data: existing } = await db.from("carrier_members").select("role").eq("carrier_id", id).eq("email", email).maybeSingle();
      if (existing) fail(409, "This email already has access.");
      await db.from("carrier_members").insert({ carrier_id: id, email, role: m.role, person_id: m.role === "driver" ? m.personId : null });
      await audit(id, user, "member.invited");
      const outcome = await ensureLogin(email, access.name);
      const status = outcome.existing
        ? "Access saved. They already have a login and will see this office the next time they sign in."
        : outcome.emailed
          ? "Access saved and a sign-up link was emailed to " + email + "."
          : "Access saved. Email isn't set up yet, so copy this one-time sign-up link and send it to them:";
      return json({ status, link: outcome.emailed ? undefined : outcome.link }, 201);
    }
  }

  if (resource === "files" && parts[3]) {
    const fileId = parts[3];
    if (!validId(fileId)) fail(404, "File not found.");
    const key = id + "/office/" + fileId;
    const { data: metadata } = await db.from("office_files").select("*").eq("carrier_id", id).eq("id", fileId).maybeSingle();

    // Upload in two steps so large phone photos go straight to storage:
    // POST .../files/<id>?... returns a one-time upload link; POST .../files/<id>/complete records it.
    if (req.method === "POST") {
      if (metadata) fail(409, "File already exists.");
      const q = url.searchParams;
      const mime = q.get("mime") || "application/octet-stream";
      const size = Number(q.get("size"));
      if (!ALLOWED_MIME.includes(mime)) fail(415, "Use PDF, JPEG, PNG, WebP, text, CSV or DOCX.");
      if (!(size > 0 && size <= MAX_FILE_BYTES)) fail(413, "File must be 1 byte to 20 MB.");
      const name = q.get("name")?.slice(0, 200) || "Document";
      const recordId = q.get("record") || "";
      const record = recordId ? (state.records || []).find((r: any) => r.id === recordId) : null;
      if (recordId && !record) fail(400, "Record not found.");
      const person = access.role === "driver" ? access.person_id : record?.person || q.get("person") || null;
      if (access.role === "driver" && (!person || (record && record.person !== person))) fail(403, "Drivers can only upload their own documents.");
      if (person && !(state.people || []).some((p: any) => p.id === person)) fail(400, "Driver not found.");
      const purpose = (q.get("purpose") || "Other").slice(0, 100);
      const expires = q.get("date") || null;
      if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) fail(400, "Invalid date.");

      if (parts[4] !== "complete") {
        const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(key);
        if (error || !data) fail(500, "Upload could not start. Please retry.");
        return json({ uploadUrl: data!.signedUrl });
      }
      const { data: listed } = await db.storage.from(BUCKET).list(id + "/office", { search: fileId });
      const obj = listed?.find((o) => o.name === fileId);
      if (!obj) fail(400, "Upload not found. Please retry.");
      const realSize = Number(obj!.metadata?.size ?? 0);
      const realMime = String(obj!.metadata?.mimetype ?? "");
      if (!ALLOWED_MIME.includes(realMime) || !(realSize > 0 && realSize <= MAX_FILE_BYTES)) {
        await db.storage.from(BUCKET).remove([key]);
        fail(415, "Use PDF, JPEG, PNG, WebP, text, CSV or DOCX up to 20 MB.");
      }
      const { error } = await db.from("office_files").insert({
        id: fileId, carrier_id: id, person_id: person, record_id: recordId || null, purpose, name,
        mime: realMime, size: realSize, expires_on: expires, uploaded_by: user.id,
      });
      if (error) { await db.storage.from(BUCKET).remove([key]); fail(500, "The file could not be saved."); }
      await audit(id, user, "file.uploaded");
      return json({ id: fileId }, 201);
    }

    if (!metadata) fail(404, "File not found.");
    if (access.role === "driver" && metadata!.person_id !== access.person_id) fail(403, "You cannot access this driver document.");
    if (req.method === "GET") {
      const { data, error } = await db.storage.from(BUCKET).createSignedUrl(key, 60, { download: metadata!.name });
      if (error || !data) fail(404, "File unavailable.");
      return NextResponse.redirect(data!.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (req.method === "DELETE") {
      if (access.role === "driver") fail(403, "Ask the carrier owner to remove a file.");
      await db.storage.from(BUCKET).remove([key]);
      await db.from("office_files").delete().eq("carrier_id", id).eq("id", fileId);
      await audit(id, user, "file.removed");
      return json({ removed: true });
    }
  }

  return fail(404, "Not found.");
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await ctx.params;
    return await api(req, path);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error("office api error", error);
    return json({ error: "The operation failed. Please retry." }, 500);
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
