import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/create-account",
  "/pending-approval",
  "/api/signup",
  "/api/pesapal/ipn",
  "/api/public/schools/search",
  "/api/auth/register-staff",
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const isPublic = PUBLIC_PATHS.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith(`${path}/`)
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase env vars in middleware");
    // Fail safe rather than crashing the request
    return isPublic
      ? response
      : NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    return response;
  } catch (err) {
    console.error("Middleware auth check failed:", err);
    // Don't 500 the whole request — degrade to redirect-to-login for
    // protected routes, pass through for public ones.
    return isPublic
      ? response
      : NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/pesapal/ipn|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};