import {fixtures} from "@/lib/admin/fixtures";
import {LeadDesk} from "@/components/admin/lead-desk";
import { requireOwner as requireAdmin } from "@/lib/admin/owner";
import { createClient } from "@/lib/supabase/server";


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
  const owner=await requireAdmin();
  const { status } = await searchParams;
  if(owner.id==="local-lab-owner")return <LeadDesk leads={fixtures("owner").leads.filter(l=>!status||l.status===status)} status={status}/>;
  const supabase = await createClient();
  let query = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(200);
  if (status && STATUSES.includes(status)) query = query.eq("status", status);
  const { data } = await query;
  const leads = (data ?? []) as Lead[];

  return <LeadDesk leads={leads} status={status}/>;
}
