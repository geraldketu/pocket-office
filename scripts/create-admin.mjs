// Creates (or promotes) the admin login.
// Usage: npm run create-admin -- you@example.com "a-long-password"
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: npm run create-admin -- you@example.com "a-long-password"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

let userId;
const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
if (error) {
  // Already exists: find them and promote.
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) {
    console.error("Could not create user:", error.message);
    process.exit(1);
  }
  userId = existing.id;
  await supabase.auth.admin.updateUserById(userId, { password });
} else {
  userId = data.user.id;
}

const { error: pErr } = await supabase
  .from("profiles")
  .upsert({ id: userId, email, role: "admin", carrier_id: null });
if (pErr) {
  console.error("Could not set admin role:", pErr.message);
  process.exit(1);
}
console.log(`Admin ready: ${email}`);
