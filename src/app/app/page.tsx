import {CarrierOffice} from "@/components/carrier-office";
import { requireCarrier } from "@/lib/auth";
import { type DocumentRow, type DocumentType } from "@/lib/compliance";
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

  return <CarrierOffice profile={profile} carrier={carrier} types={t} docs={d}/>;
}
