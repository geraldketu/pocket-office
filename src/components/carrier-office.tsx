import { AppHeader } from "@/components/app-header";
import { ComplianceBadge } from "@/components/badges";
import { Checklist } from "@/components/checklist";
import { DocumentList } from "@/components/document-list";
import { DocumentUploadForm } from "@/components/document-upload-form";
import { carrierCompliance, type DocumentRow, type DocumentType } from "@/lib/compliance";


export function CarrierOffice({profile,carrier,types:t,docs:d}:{profile:{email:string;carrier_id:string};carrier:{legal_name:string;dba?:string|null;usdot?:string|null;mc?:string|null}|null;types:DocumentType[];docs:DocumentRow[]}){
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
