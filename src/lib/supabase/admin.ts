import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses row-level security.
// Only use on the server, and only after checking the caller is allowed.
export function createAdminClient() {
  if(process.env.NODE_ENV!=="production"&&process.env.OLIVERFEE_ADMIN_LAB==="1")throw new Error("Production service-role access is disabled in the isolated admin lab.");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
