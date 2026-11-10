import {sameOrigin,loopbackHost} from "@/lib/admin/http";
import {NextRequest,NextResponse} from "next/server";
import {labEnabled,TEST_PASSWORD} from "@/lib/admin/policy";
import {labToken} from "@/lib/admin/store";
export async function POST(req:NextRequest){
 if(!labEnabled(process.env)||!loopbackHost(req))return new NextResponse("Not found",{status:404});
 if(!sameOrigin(req))return new NextResponse("Forbidden",{status:403});
 const form=await req.formData();
 if(form.get("logout")==="1"){const response=NextResponse.redirect(new URL("/admin-lab",req.url),303);response.cookies.set("oliver-admin-lab","",{httpOnly:true,sameSite:"strict",path:"/admin",maxAge:0});return response;}
 if(form.get("password")!==TEST_PASSWORD)return new NextResponse("Invalid test credentials",{status:403});
 const response=NextResponse.redirect(new URL("/admin",req.url),303);response.cookies.set("oliver-admin-lab",labToken(),{httpOnly:true,sameSite:"strict",path:"/admin",maxAge:14400});return response;
}
