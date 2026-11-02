import { AppHeader } from "@/components/app-header";
import { ComplianceBadge } from "@/components/badges";
import { Checklist } from "@/components/checklist";
import { DocumentList } from "@/components/document-list";
import { DocumentUploadForm } from "@/components/document-upload-form";
import { requireCarrier } from "@/lib/auth";
import { carrierCompliance, type DocumentRow, type DocumentType } from "@/lib/compliance";
import { createClient } from "@/lib/supabase/server";

// The trucker's home screen: their paperwork vault.
export default async function CarrierHome() {
  const profile = await requireCarrier();
  const supabase = await createClient();

  const [{ data: carrier }, { data: types }, { data: docs }] = await Promise.all([
    supabase.from("carriers").select("legal_name, dba, usdot, mc").eq("id", profile.carrier_id).single(),
    supabase.from("document_types").select("*").order("sort_order"),
    supabase
      .from("documents")
      .select("*")
      .eq("carrier_id", profile.carrier_id)
      .order("created_at", { ascending: false }),
  ]);
  const t = (types ?? []) as DocumentType[];
  const d = (docs ?? []) as DocumentRow[];

  return (
    <>
      <AppHeader email={profile.email} nav={[{ href: "/app", label: "My documents" }]} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">{carrier?.dba || carrier?.legal_name}</h1>
            <p className="text-sm text-slate-500">
              {carrier?.usdot && `USDOT ${carrier.usdot}`} {carrier?.mc && ` · MC ${carrier.mc}`}
            </p>
          </div>
          <ComplianceBadge value={carrierCompliance(t, d)} />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <section className="card lg:col-span-3">
            <h2 className="mb-4 text-lg font-semibold">Add a document</h2>
            <DocumentUploadForm carrierId={profile.carrier_id} types={t} />
          </section>
          <section className="card lg:col-span-2">
            <h2 className="mb-2 text-lg font-semibold">Required documents</h2>
            <Checklist types={t} docs={d} />
          </section>
        </div>

        <section className="card">
          <h2 className="mb-2 text-lg font-semibold">All my documents</h2>
          <DocumentList docs={d} types={t} />
        </section>
      </main>
    </>
  );
}
