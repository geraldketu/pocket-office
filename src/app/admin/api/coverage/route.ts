import fs from "node:fs/promises";
import path from "node:path";
import {ownerIdentity} from "@/lib/admin/owner";
export const dynamic="force-dynamic";
export async function GET(){if(!await ownerIdentity())return Response.json({error:"Owner access required"},{status:403});try{return new Response(await fs.readFile(path.join(process.cwd(),"docs/ADMIN-PREVIEW-COVERAGE.json"),"utf8"),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});}catch{return Response.json({error:"Run npm run test:admin to generate the coverage checklist."},{status:404});}}
