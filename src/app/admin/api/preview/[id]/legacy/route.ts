import {sameOrigin} from "@/lib/admin/http";
import {NextRequest} from "next/server";
import {ownerIdentity} from "@/lib/admin/owner";
import {withPreview} from "@/lib/admin/store";
import {legacyCall} from "@/lib/admin/legacy";
async function handle(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const owner=await ownerIdentity();if(!owner)return Response.json({error:"Owner access required"},{status:403});return withPreview((await params).id,owner.id,async(s)=>{if(!s)return Response.json({error:"Owner-bound test session required"},{status:403});
 if(!["GET","HEAD"].includes(req.method)&&!sameOrigin(req))return Response.json({error:"Same-origin request required"},{status:403});
 if(!s.role.startsWith("archive-")&&s.role!=="owner")return Response.json({error:"This test role cannot access the archived Worker"},{status:403});
 const target=req.nextUrl.searchParams.get("path")||"";const body=["GET","HEAD"].includes(req.method)?undefined:await req.arrayBuffer();const response=await legacyCall(s,target,req.method,body,req.headers.get("content-type")||"application/json");
 return new Response(response.body,{status:response.status,headers:{"Content-Type":response.headers.get("content-type")||"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
});}
export const GET=handle,POST=handle,PUT=handle,DELETE=handle;
