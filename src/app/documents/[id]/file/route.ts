import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sends the user to a short-lived signed link for one document.
// Row-level security means a carrier can only find their own documents.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("file_path, file_name")
    .eq("id", id)
    .maybeSingle();
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const download = request.nextUrl.searchParams.has("download");
  const { data, error } = await supabase.storage
    .from("carrier-files")
    .createSignedUrl(doc.file_path, 60, download ? { download: doc.file_name || true } : undefined);
  if (error || !data) return new NextResponse("Could not open file", { status: 500 });

  return NextResponse.redirect(data.signedUrl);
}
