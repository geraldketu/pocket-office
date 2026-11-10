import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfigured } from "@/lib/config";

// Refreshes the login session on every request and keeps
// signed-out visitors out of the private areas.
export async function middleware(request: NextRequest) {
  const protectedPage = ["/admin", "/app", "/set-password", "/dashboard", "/documents"].some(p => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(p + "/"));
  if (!authConfigured()) {
    if (!protectedPage) return NextResponse.next();
    return NextResponse.redirect(new URL("/login?error=unavailable",request.url));
  }
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
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
  const isPrivate = ["/admin", "/app", "/set-password", "/dashboard", "/documents"].some(
    (p) => path === p || path.startsWith(p + "/"),
  );
  if (!user && isPrivate) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
