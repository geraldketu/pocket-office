import {authConfigured,requestsConfigured} from "@/lib/config";
export const dynamic="force-dynamic";
export async function GET(){
 return Response.json({application:"OliverFee 360",release:"admin-portal-v1",commit:process.env.VERCEL_GIT_COMMIT_SHA||null,repository:process.env.VERCEL_GIT_REPO_OWNER&&process.env.VERCEL_GIT_REPO_SLUG?`${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`:null,environment:process.env.VERCEL_ENV||process.env.NODE_ENV,checks:{authentication:authConfigured(),privatePreviewStorage:requestsConfigured()}},{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}
