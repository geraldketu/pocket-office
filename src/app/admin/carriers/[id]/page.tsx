import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ResendInviteButton } from "../../invite-forms";

export default async function CarrierDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = createAdminClient();
  const [{ data: carrier }, { data: members }, { count: files }] = await Promise.all([
    db.from("carriers").select("*").eq("id", id).maybeSingle(),
    db.from("carrier_members").select("email, role, user_id").eq("carrier_id", id).order("role"),
    db.from("office_files").select("id", { count: "exact", head: true }).eq("carrier_id", id),
  ]);
  if (!carrier) notFound();

  return (
    <>
      <Link href="/admin" className="text-sm font-semibold text-[#78501a] hover:underline">← All carriers</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold tracking-[.15em] text-[#80551e]">CARRIER</p>
          <h1 className="text-2xl font-bold">{carrier.dba || carrier.legal_name}</h1>
          <p className="text-sm text-[#625f69]">
            {carrier.legal_name}
            {carrier.usdot && ` · USDOT ${carrier.usdot}`}
            {carrier.mc && ` · MC ${carrier.mc}`}
            {carrier.phone && ` · ${carrier.phone}`}
          </p>
        </div>
        <a href={`/?carrier=${carrier.id}#member`} className="btn">Open Member Office</a>
      </div>

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">People with access</h2>
        {members?.length ? (
          <ul className="divide-y divide-[#f0ece6]">
            {members.map((m) => (
              <li key={m.email} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>{m.email} <span className="text-[#625f69]">· {m.role}</span></span>
                <span className={`badge ${m.user_id ? "good" : "warn"}`}>{m.user_id ? "Signed in" : "Not signed in yet"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#625f69]">No one has access yet.</p>
        )}
        <p className="mt-3 text-sm text-[#625f69]">{files ?? 0} file(s) uploaded. Owners can invite office users and drivers from Carrier accounts in their office.</p>
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">Account access</h2>
        <p className="mb-3 text-sm text-[#625f69]">If the owner&apos;s link expired or they forgot their password, make a new one-time link.</p>
        <ResendInviteButton carrierId={carrier.id} />
      </section>
    </>
  );
}
