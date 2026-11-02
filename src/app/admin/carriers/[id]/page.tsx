import Link from "next/link";
import { notFound } from "next/navigation";
import { ComplianceBadge } from "@/components/badges";
import { Checklist } from "@/components/checklist";
import { DocumentList } from "@/components/document-list";
import { DocumentUploadForm } from "@/components/document-upload-form";
import { requireAdmin } from "@/lib/auth";
import { carrierCompliance, type DocumentRow, type DocumentType } from "@/lib/compliance";
import { createClient } from "@/lib/supabase/server";
import { ResendInviteButton } from "../../invite-forms";

export default async function CarrierDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: carrier }, { data: types }, { data: docs }, { data: logins }] = await Promise.all([
    supabase.from("carriers").select("*").eq("id", id).maybeSingle(),
    supabase.from("document_types").select("*").order("sort_order"),
    supabase.from("documents").select("*").eq("carrier_id", id).order("created_at", { ascending: false }),
    supabase.from("profiles").select("email").eq("carrier_id", id),
  ]);
  if (!carrier) notFound();
  const t = (types ?? []) as DocumentType[];
  const d = (docs ?? []) as DocumentRow[];

  return (
    <>
      <Link href="/admin" className="text-sm text-blue-700 hover:underline">← All carriers</Link>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{carrier.dba || carrier.legal_name}</h1>
          <p className="text-sm text-slate-500">
            {carrier.legal_name}
            {carrier.usdot && ` · USDOT ${carrier.usdot}`}
            {carrier.mc && ` · MC ${carrier.mc}`}
            {carrier.phone && ` · ${carrier.phone}`}
          </p>
          <p className="text-sm text-slate-500">Login: {logins?.map((l) => l.email).join(", ") || "none"}</p>
        </div>
        <ComplianceBadge value={carrierCompliance(t, d)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card lg:col-span-2">
          <h2 className="mb-2 text-lg font-semibold">Missing documents checklist</h2>
          <Checklist types={t} docs={d} />
        </section>
        <section className="card lg:col-span-3">
          <h2 className="mb-4 text-lg font-semibold">Upload for this carrier</h2>
          <DocumentUploadForm carrierId={carrier.id} types={t} />
        </section>
      </div>

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">Documents</h2>
        <DocumentList docs={d} types={t} />
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">Account access</h2>
        <p className="mb-3 text-sm text-slate-500">If their invite expired or they forgot their password, make a new one-time link.</p>
        <ResendInviteButton carrierId={carrier.id} />
      </section>
    </>
  );
}
