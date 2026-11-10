import {fixtures} from "@/lib/admin/fixtures";
import {CarrierDetailView} from "@/components/admin/carrier-detail";
import { notFound } from "next/navigation";
import { requireOwner as requireAdmin } from "@/lib/admin/owner";
import { type DocumentRow, type DocumentType } from "@/lib/compliance";
import { createClient } from "@/lib/supabase/server";

export default async function CarrierDetail({ params }: { params: Promise<{ id: string }> }) {
  const owner=await requireAdmin();
  const { id } = await params;
  if(owner.id==="local-lab-owner"){const f=fixtures("owner");if(id!==f.carrier.id)notFound();return <CarrierDetailView carrier={f.carrier} types={f.types} docs={f.docs} logins={[{email:"basic@example.test"}]} readOnly/>;}
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

  return <CarrierDetailView carrier={carrier} types={t} docs={d} logins={logins||[]} readOnly/>;
}
