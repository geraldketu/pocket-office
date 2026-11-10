import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/config";

export async function POST(request: NextRequest) {
  if(request.headers.get("origin")!==request.nextUrl.origin)return NextResponse.json({error:"Request origin could not be verified."},{status:403});
  if(!authConfigured())return NextResponse.redirect(new URL("/login",request.url),{status:303});
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.nextUrl.origin), { status: 303 });
}
