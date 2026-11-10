import {ownerIdentity} from "@/lib/admin/owner";
import {readOverview} from "@/lib/admin/overview";
export const dynamic="force-dynamic";
export async function GET(request:Request){const owner=await ownerIdentity();if(!owner)return Response.json({error:"Owner access required"},{status:403});return Response.json(await readOverview(owner.id==="local-lab-owner",Math.min(50000,Math.max(0,Math.floor(Number(new URL(request.url).searchParams.get("page"))||0)))),{headers:{"Cache-Control":"no-store"}});}
