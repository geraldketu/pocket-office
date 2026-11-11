import {sameOrigin} from "@/lib/admin/http";
import {NextRequest} from "next/server";
import {ownerIdentity} from "@/lib/admin/owner";
import {openPreview} from "@/lib/admin/store";
import {PREVIEW_ROLES,safePreviewPath,type PreviewRole} from "@/lib/admin/policy";
export async function POST(req:NextRequest){
 const owner=await ownerIdentity();if(!owner)return Response.json({error:"Owner access required"},{status:403});
 if(!sameOrigin(req))return Response.json({error:"Same-origin request required"},{status:403});
 try{const data=await req.json();if(!PREVIEW_ROLES.includes(data.role))return Response.json({error:"Invalid role"},{status:400});const s=await openPreview(owner.id,data.role as PreviewRole,typeof data.scenario==="string"?data.scenario.slice(0,40):"populated");const p=typeof data.path==="string"?`&path=${encodeURIComponent(safePreviewPath(data.path))}`:"";return Response.json({id:s.id,url:`/admin/preview/${s.id}${p?"?"+p.slice(1):""}`},{headers:{"Cache-Control":"no-store"}});}catch{return Response.json({error:"Could not create test preview"},{status:400});}
}
