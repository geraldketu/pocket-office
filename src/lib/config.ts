export function authConfigured() {
  if(process.env.NODE_ENV!=="production"&&process.env.NEXT_PUBLIC_OLIVERFEE_ADMIN_LAB==="1")return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && key.length > 30 && !/YOUR[-_]|placeholder/i.test(key);
}
export function requestsConfigured() {
  if(process.env.NODE_ENV!=="production"&&process.env.OLIVERFEE_ADMIN_LAB==="1")return false;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return authConfigured() && key.length > 30 && !/YOUR[-_]|placeholder/i.test(key);
}
