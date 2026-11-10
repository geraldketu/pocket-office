import {sameOrigin} from "@/lib/admin/http";
import {NextRequest} from "next/server";
import {ownerIdentity} from "@/lib/admin/owner";
import {getPreview,deletePreview} from "@/lib/admin/store";
import {simulate} from "@/lib/admin/simulator";
async function session(id:string){const owner=await ownerIdentity();return owner?getPreview(id,owner.id):null;}
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){const s=await session((await params).id);if(!s)return Response.json({error:"Owner-bound test session required"},{status:403});return Response.json({role:s.role,scenario:s.scenario,events:s.data.events,profile:s.data.profile},{headers:{"Cache-Control":"no-store"}});}
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const s=await session((await params).id);if(!s)return Response.json({error:"Owner-bound test session required"},{status:403});if(!sameOrigin(req))return Response.json({error:"Same-origin request required"},{status:403});
 try{if(Number(req.headers.get("content-length")||0)>1000000)return Response.json({error:"Test payload too large"},{status:413});const data=await req.json();return Response.json(await simulate(s,data.op,data),{headers:{"Cache-Control":"no-store"}});}catch(e){return Response.json({error:e instanceof Error?e.message:"Test action failed"},{status:(e as {status?:number}).status||400});}
}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){const owner=await ownerIdentity();if(!owner||!sameOrigin(req))return Response.json({error:"Owner access required"},{status:403});return Response.json({removed:deletePreview((await params).id,owner.id)});}
