import Link from "next/link";
import { ComplianceBadge } from "@/components/badges";
import { requireAdmin } from "@/lib/auth";
import { carrierCompliance, type Compliance, type DocumentRow, type DocumentType } from "@/lib/compliance";
import { createClient } from "@/lib/supabase/server";
import { NewCarrierForm } from "./invite-forms";

export default async function AdminHome() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: carriers }, { data: types }, { data: docs }, { count: newLeads }] = await Promise.all([
    supabase.from("carriers").select("id, legal_name, dba, usdot, tier, status").order("legal_name"),
    supabase.from("document_types").select("*"),
    supabase.from("documents").select("id, carrier_id, type_id, expires_on, status, created_at"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  const t = (types ?? []) as DocumentType[];
  const byCarrier = new Map<string, DocumentRow[]>();
  for (const d of (docs ?? []) as DocumentRow[]) {
    byCarrier.set(d.carrier_id, [...(byCarrier.get(d.carrier_id) ?? []), d]);
  }
  const rows = (carriers ?? []).map((c) => ({
    ...c,
    compliance: carrierCompliance(t, byCarrier.get(c.id) ?? []) as Compliance,
  }));
  const count = (v: Compliance) => rows.filter((r) => r.compliance === v).length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Carriers" value={rows.length} />
        <Stat label="Need action" value={count("red")} tone="text-red-700" />
        <Stat label="Expiring soon" value={count("yellow")} tone="text-amber-700" />
        <Link href="/admin/leads"><Stat label="New leads" value={newLeads ?? 0} tone="text-blue-700" /></Link>
      </div>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">Carriers</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No carriers yet. Add your first one below.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/carriers/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{c.dba || c.legal_name}</p>
                    <p className="text-xs text-slate-500">
                      {c.usdot ? `USDOT ${c.usdot}` : "No USDOT"} · {c.tier || "No tier"} · {c.status}
                    </p>
                  </div>
                  <ComplianceBadge value={c.compliance} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="mb-1 text-lg font-semibold">Add a carrier</h2>
        <p className="mb-4 text-sm text-slate-500">
          Creates their account and sends a one-time link so they can choose their own password.
        </p>
        <NewCarrierForm />
      </section>
    </>
  );
}

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-slate-500 uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
