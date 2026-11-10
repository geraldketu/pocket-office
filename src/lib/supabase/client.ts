import { createBrowserClient } from "@supabase/ssr";

// Supabase client for code that runs in the browser.
export function createClient() {
  if(process.env.NODE_ENV!=="production"&&process.env.NEXT_PUBLIC_OLIVERFEE_ADMIN_LAB==="1")throw new Error("Live authentication/storage is disabled in the isolated admin lab.");
  if(typeof window!=="undefined"&&window.location.pathname.startsWith("/admin/preview/"))throw new Error("Live authentication and storage are blocked inside preview. Use the isolated test adapter.");
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
