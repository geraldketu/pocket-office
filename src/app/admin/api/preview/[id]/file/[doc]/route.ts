import {NextRequest} from "next/server";
import {ownerIdentity} from "@/lib/admin/owner";
import {withPreviewRead} from "@/lib/admin/store";
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string;doc:string}>}){
 const owner=await ownerIdentity(),p=await params;if(!owner)return new Response("Owner access required",{status:403});return withPreviewRead(p.id,owner.id,async(s)=>{if(!s)return new Response("Owner-bound preview required",{status:403});
 const d=s.data.docs.find(d=>d.id===p.doc),profile=s.data.profile;if(!d||!profile||profile.role!=="admin"&&d.carrier_id!==profile.carrier_id)return new Response("Not found",{status:404});
 if(s.scenario==="storage-error")return new Response("Could not open file",{status:500});
 return new Response(`OLIVERFEE 360 — TEST DOCUMENT\n${d.file_name}\nSynthetic data only. This is not a live customer file.`,{headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store",...(req.nextUrl.searchParams.has("download")?{"Content-Disposition":'attachment; filename="OliverFee-SAMPLE.txt"'}:{})}});
});
}