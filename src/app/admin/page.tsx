import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NewCarrierForm } from "./invite-forms";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Counts records in a carrier's office that are past due or due within 30 days.
function attention(state: any) {
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const records = (state?.records ?? []).filter((r: any) => r.status !== "Archived" && r.date);
  return {
    overdue: records.filter((r: any) => r.date < today).length,
    soon: records.filter((r: any) => r.date >= today && r.date <= soon).length,
  };
}

export default async function AdminHome() {
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: carriers }, { data: offices }, { count: newLeads }] = await Promise.all([
    db.from("carriers").select("id, legal_name, dba, usdot, tier, status").order("legal_name"),
    db.from("workspaces").select("carrier_id, state"),
    db.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  const byCarrier = new Map((offices ?? []).map((o) => [o.carrier_id, attention(o.state)]));
  const rows = (carriers ?? []).map((c) => ({ ...c, ...(byCarrier.get(c.id) ?? { overdue: 0, soon: 0 }) }));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Carriers" value={rows.length} />
        <Stat label="Overdue items" value={rows.reduce((n, r) => n + r.overdue, 0)} tone="text-[#a11b51]" />
        <Stat label="Due in 30 days" value={rows.reduce((n, r) => n + r.soon, 0)} tone="text-[#785115]" />
        <Link href="/admin/leads"><Stat label="New leads" value={newLeads ?? 0} tone="text-[#80551e]" /></Link>
      </div>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">Carriers</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-[#625f69]">No carriers yet. Add your first one below.</p>
        ) : (
          <ul className="divide-y divide-[#f0ece6]">
            {rows.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/carriers/${c.id}`} className="font-semibold hover:underline">{c.dba || c.legal_name}</Link>
                  <p className="text-xs text-[#625f69]">
                    {c.usdot ? `USDOT ${c.usdot}` : "No USDOT"} · {c.tier || "No tier"} · {c.status}
                  </p>
                </div>
                {c.overdue > 0 && <span className="badge bad">{c.overdue} overdue</span>}
                {c.soon > 0 && <span className="badge warn">{c.soon} due soon</span>}
                {c.overdue === 0 && c.soon === 0 && <span className="badge good">Nothing due</span>}
                <a href={`/?carrier=${c.id}#member`} className="btn-secondary">Open office</a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="mb-1 text-lg font-semibold">Add a carrier</h2>
        <p className="mb-4 text-sm text-[#625f69]">
          Creates their Member Office and sends the owner a one-time link to choose their own password.
        </p>
        <NewCarrierForm />
      </section>
    </>
  );
}

function Stat({ label, value, tone = "text-[#1e1d22]" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-bold tracking-widest text-[#625f69] uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
