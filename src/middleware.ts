import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfigured } from "@/lib/config";
import {labEnabled} from "@/lib/admin/policy";

// Refreshes the login session on every request and keeps
// signed-out visitors out of the private areas.
export async function middleware(request: NextRequest) {
  if(labEnabled(process.env)&&!["GET","HEAD","OPTIONS"].includes(request.method)&&!request.nextUrl.pathname.startsWith("/admin/api/preview")&&request.nextUrl.pathname!=="/api/admin-lab")return NextResponse.json({error:"Live mutations are disabled in the isolated admin lab"},{status:403});
  const referer=request.headers.get("referer")||"";
  const fromPreview=/\/admin\/preview\/[^/]+\/view(?:\/|$)/.test(referer)||/\/admin\/api\/preview\/[^/]+\/archive\//.test(referer);
  const allowedPreviewPath=request.nextUrl.pathname.startsWith("/admin/preview/")||request.nextUrl.pathname.startsWith("/admin/api/preview/")||request.nextUrl.pathname.startsWith("/_next/");
  if(fromPreview&&!allowedPreviewPath)return NextResponse.json({error:"Live routes are blocked from the isolated preview. Use its session links and simulators."},{status:403});
  const requestHeaders=new Headers(request.headers);
  requestHeaders.delete("x-oliver-preview-view");
  if(/^\/admin\/preview\/[^/]+\/view(?:\/|$)/.test(request.nextUrl.pathname))requestHeaders.set("x-oliver-preview-view","1");
  // This skips session refresh only. Every admin page/API still validates the opaque lab cookie server-side.
  if(labEnabled(process.env)&&request.nextUrl.pathname.startsWith("/admin")&&request.cookies.has("oliver-admin-lab")){
    const result=NextResponse.next({request:{headers:requestHeaders}});
    if(requestHeaders.has("x-oliver-preview-view"))result.headers.set("Content-Security-Policy","default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; frame-src 'self'; form-action 'self'; object-src 'none'; base-uri 'self'");
    return result;
  }
  const protectedPage = ["/admin", "/app", "/set-password", "/dashboard", "/documents", "/account"].some(p => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(p + "/"));
  if (!authConfigured()) {
    if (!protectedPage) return NextResponse.next({request:{headers:requestHeaders}});
    if(request.nextUrl.pathname.startsWith("/admin/api/"))return NextResponse.json({error:"Owner access required"},{status:403});
    return NextResponse.redirect(new URL("/login?error=unavailable",request.url));
  }
  let response = NextResponse.next({request:{headers:requestHeaders}});

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          requestHeaders.set("cookie",request.headers.get("cookie")||"");
          response = NextResponse.next({request:{headers:requestHeaders}});
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPrivate = ["/admin", "/app", "/set-password", "/dashboard", "/documents", "/account"].some(
    (p) => path === p || path.startsWith(p + "/"),
  );
  if (!user && isPrivate) {
    if(path.startsWith("/admin/api/"))return NextResponse.json({error:"Owner access required"},{status:403});
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if(requestHeaders.has("x-oliver-preview-view"))response.headers.set("Content-Security-Policy","default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; frame-src 'self'; form-action 'self'; object-src 'none'; base-uri 'self'");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
