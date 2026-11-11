import {sameOrigin} from "@/lib/admin/http";
import {NextRequest} from "next/server";
import {ownerIdentity} from "@/lib/admin/owner";
import {withPreview,withPreviewRead,removePreview} from "@/lib/admin/store";
import {simulate} from "@/lib/admin/simulator";
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const owner=await ownerIdentity();if(!owner)return Response.json({error:"Owner access required"},{status:403});
 return withPreviewRead((await params).id,owner.id,async(s)=>s?Response.json({role:s.role,scenario:s.scenario,events:s.data.events,profile:s.data.profile},{headers:{"Cache-Control":"no-store"}}):Response.json({error:"Owner-bound test session required"},{status:403}));
}
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const owner=await ownerIdentity();if(!owner||!sameOrigin(req))return Response.json({error:"Owner and same-origin request required"},{status:403});
 try{return await withPreview((await params).id,owner.id,async(s)=>{
  if(!s)return Response.json({error:"Owner-bound test session required"},{status:403});
  if(Number(req.headers.get("content-length")||0)>1000000)return Response.json({error:"Test payload too large"},{status:413});
  const data=await req.json();return Response.json(await simulate(s,data.op,data),{headers:{"Cache-Control":"no-store"}});
 });}catch(e){return Response.json({error:e instanceof Error?e.message:"Test action failed"},{status:(e as {status?:number}).status||400});}
}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){const owner=await ownerIdentity();if(!owner||!sameOrigin(req))return Response.json({error:"Owner access required"},{status:403});return Response.json({removed:await removePreview((await params).id,owner.id)});}
