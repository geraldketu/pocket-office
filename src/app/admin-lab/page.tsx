import {notFound} from "next/navigation";
import {labEnabled,TEST_PASSWORD} from "@/lib/admin/policy";
import {Brand} from "@/components/site-shell";
export default function LabLogin(){if(!labEnabled(process.env))notFound();return <main className="auth-wrap"><Brand/><h1>Isolated owner test account</h1><p className="notice">Local development only. No Supabase account is created. Test accounts and records live only in server memory.</p><form className="card" method="post" action="/api/admin-lab"><label className="label">Owner test password<input className="field" type="password" name="password" required/></label><button className="btn">Open Site Explorer</button></form><p className="muted">Test password: <code>{TEST_PASSWORD}</code></p></main>;}
