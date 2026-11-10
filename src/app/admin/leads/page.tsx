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
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Leads</h1>
        {["all", ...STATUSES].map((s) => (
          <a
            key={s}
            href={s === "all" ? "/admin/leads" : `/admin/leads?status=${s}`}
            className={`rounded-full px-3 py-1 text-sm capitalize ${
              (status ?? "all") === s ? "bg-[#222126] text-white" : "bg-white text-[#1e1d22] ring-1 ring-[#e8e3dc]"
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
        <p className="text-sm text-[#625f69]">No leads here yet.</p>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <form key={l.id} action={updateLead} className="card grid gap-3 sm:grid-cols-6">
              <input type="hidden" name="id" value={l.id} />
              <div className="sm:col-span-2">
                <p className="font-medium">{l.name}{l.company && ` · ${l.company}`}</p>
                <p className="text-xs text-[#625f69]">
                  {l.usdot && `USDOT ${l.usdot} · `}
                  {l.phone && <a className="text-[#78501a]" href={`tel:${l.phone}`}>{l.phone}</a>}
                  {l.email && ` · ${l.email}`}
                </p>
                <p className="text-xs text-[#8a8590]">
                  {l.source} · {new Date(l.created_at).toLocaleDateString("en-US")}
                </p>
                {l.message && <p className="mt-1 text-sm text-[#625f69]">&ldquo;{l.message}&rdquo;</p>}
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
