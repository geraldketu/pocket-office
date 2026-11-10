import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addLead, updateLead } from "../actions";

const STATUSES = ["new", "called", "quoted", "paid", "active", "lost"];

type Lead = {
  id: string;
  name: string;
  company: string | null;
  usdot: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  status: string;
  quoted_price: number | null;
  notes: string | null;
  message: string | null;
  created_at: string;
};

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(200);
  if (status && STATUSES.includes(status)) query = query.eq("status", status);
  const { data } = await query;
  const leads = (data ?? []) as Lead[];

  return (
    <>
      <section className="page-hero"><span className="eyebrow">Carrier outreach</span><h1>Carrier Lead Desk</h1><p className="hero-copy">Review the request, make the call, and keep your next follow-up in sight.</p></section>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Leads</h1>
        {["all", ...STATUSES].map((s) => (
          <a
            key={s}
            href={s === "all" ? "/admin/leads" : `/admin/leads?status=${s}`}
            className={`rounded-full px-3 py-1 text-sm capitalize ${
              (status ?? "all") === s ? "bg-blue-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">Add a lead</h2>
        <form action={addLead} className="grid gap-3 sm:grid-cols-5">
          <input className="field" name="name" placeholder="Contact name *" required />
          <input className="field" name="company" placeholder="Company" />
          <input className="field" name="usdot" placeholder="USDOT #" />
          <input className="field" name="phone" placeholder="Phone" type="tel" />
          <button className="btn">Add lead</button>
        </form>
      </section>

      {leads.length === 0 ? (
        <p className="text-sm text-slate-500">No leads here yet.</p>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <form key={l.id} action={updateLead} className="card grid gap-3 sm:grid-cols-6">
              <input type="hidden" name="id" value={l.id} />
              <div className="sm:col-span-2">
                <p className="font-medium">{l.name}{l.company && ` · ${l.company}`}</p>
                <p className="text-xs text-slate-500">
                  {l.usdot && `USDOT ${l.usdot} · `}
                  {l.phone && <a className="text-blue-700" href={`tel:${l.phone}`}>{l.phone}</a>}
                  {l.email && ` · ${l.email}`}
                </p>
                <p className="text-xs text-slate-400">
                  {l.source} · {new Date(l.created_at).toLocaleDateString("en-US")}
                </p>
                {l.message && <p className="mt-1 text-sm text-slate-600">&ldquo;{l.message}&rdquo;</p>}
              </div>
              <select className="field" name="status" defaultValue={l.status} aria-label="Status">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input className="field" name="quoted_price" defaultValue={l.quoted_price ?? ""} placeholder="Quote $" inputMode="decimal" aria-label="Quoted price" />
              <textarea className="field" name="notes" defaultValue={l.notes ?? ""} placeholder="Call notes" rows={2} aria-label="Call notes" />
              <button className="btn-secondary">Save</button>
            </form>
          ))}
        </div>
      )}
    </>
  );
}
