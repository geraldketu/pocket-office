import {NextRequest} from "next/server";
import {ownerIdentity} from "@/lib/admin/owner";
import {withPreview,withPreviewRead} from "@/lib/admin/store";
import {archiveAsset,archivedHTML} from "@/lib/admin/legacy";
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string;asset:string[]}>}){
 const owner=await ownerIdentity(),p=await params;if(!owner)return new Response("Owner access required",{status:403});const access=p.asset.join("/")==="index.html"?withPreview:withPreviewRead;return access(p.id,owner.id,async(s)=>{if(!s)return new Response("Owner-bound test session required",{status:403});if(!s.role.startsWith("archive-")&&s.role!=="owner")return new Response("Test role access denied",{status:403});
 const file=p.asset.join("/");if(file==="index.html"){try{return new Response(await archivedHTML(s,req.nextUrl.searchParams.get("screen")||"member",req.nextUrl.searchParams.get("carrier"),req.nextUrl.searchParams.get("quote")),{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; form-action 'self'; base-uri 'none'; frame-src 'none'"}});}catch(e){return new Response(e instanceof Error?e.message:"Test review unavailable",{status:(e as {status?:number}).status||500});}}
 const bytes=archiveAsset(file);if(!bytes)return new Response("Not found",{status:404});return new Response(new Uint8Array(bytes),{headers:{"Content-Type":file.endsWith(".js")?"text/javascript":file.endsWith(".css")?"text/css":"image/svg+xml","Cache-Control":"no-store"}});
});
}