import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Called once a day by Vercel Cron (see vercel.json) so the free Supabase
// project never sits idle long enough to be paused.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { error } = await createAdminClient().from("document_types").select("id").limit(1);
  return NextResponse.json({ ok: !error }, { status: error ? 500 : 200 });
}
