import Link from "next/link";
import { ComplianceBadge } from "@/components/badges";
import { Checklist } from "@/components/checklist";
import { DocumentList } from "@/components/document-list";
import { DocumentUploadForm } from "@/components/document-upload-form";
import { carrierCompliance, type DocumentRow, type DocumentType } from "@/lib/compliance";
import { ResendInviteButton } from "@/app/admin/invite-forms";


export function CarrierDetailView({carrier,types:t,docs:d,logins,readOnly=true}:{carrier:{id:string;legal_name:string;dba?:string|null;usdot?:string|null;mc?:string|null;phone?:string|null};types:DocumentType[];docs:DocumentRow[];logins:{email:string}[];readOnly?:boolean}){
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
          {readOnly?<p className="notice">Live records are read-only. Uploads are available only in isolated preview.</p>:<DocumentUploadForm carrierId={carrier.id} types={t} />}
        </section>
      </div>

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">Documents</h2>
        <DocumentList docs={d} types={t} />
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">Account access</h2>
        <p className="mb-3 text-sm text-slate-500">If their invite expired or they forgot their password, make a new one-time link.</p>
        {readOnly?<p className="notice">Invitation delivery is disabled for live records in this version.</p>:<ResendInviteButton carrierId={carrier.id} />}
      </section>
    </>
  );
}
