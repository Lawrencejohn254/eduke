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
  // Parent sign-up + guardian-linking flow. These must stay public because:
  //  - /create-parent-account is hit before any session exists.
  //  - /link-child/* is hit right after signUp(), when the parent DOES have
  //    a session but profiles.otp_verified is still false (that flag is for
  //    the staff login-time 2FA flow, purpose='login' — the parent-linking
  //    OTP is a separate purpose='parent_link' flow with its own gate inside
  //    parent-verify-otp). Without this exemption the OTP gate below would
  //    redirect a mid-signup parent to /verify-login, which is the wrong page.
  "/create-parent-account",
  "/link-child",
  // Password reset: /forgot-password is hit with no session at all.
  // /reset-password is hit with only a temporary PASSWORD_RECOVERY session
  // (no profile-based otp_verified flag applies to that session type), so
  // it must stay public too or the OTP gate below would misroute it.
  "/forgot-password",
  "/reset-password",
];

// Logged-in but not-yet-OTP-verified users must be allowed to hit these
const OTP_EXEMPT_PATHS = [
  "/verify-login",
  "/api/auth/send-login-otp",
  "/api/auth/verify-login-otp",
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  const isOtpExempt = OTP_EXEMPT_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase env vars in middleware");
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

    // OTP gate: logged in, but hasn't verified this login yet
    if (user && !isPublic && !isOtpExempt) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("otp_verified")
        .eq("id", user.id)
        .single();

      if (profile && profile.otp_verified === false) {
        const url = request.nextUrl.clone();
        url.pathname = "/verify-login";
        url.searchParams.set("email", user.email ?? "");
        return NextResponse.redirect(url);
      }
    }

    // ── Platform-admin gate (defense in depth) ───────────────────────────
    // This is NOT the authoritative check — every /platform-admin layout
    // and server action independently calls requirePlatformAdmin() via
    // lib/supabase/platform-admin-guard.ts, which is what actually enforces
    // authorization. This middleware check exists only to short-circuit
    // obviously-unauthorized requests as early as possible, using the same
    // request-scoped, RLS-bound client (never the service-role admin
    // client, never a client-supplied role/header). Fails closed: any
    // error from the RPC itself is treated as "not an admin".
    const isPlatformAdminRoute = pathname.startsWith("/platform-admin");

    if (user && isPlatformAdminRoute) {
      const { data: isAdmin, error: adminCheckError } = await supabase.rpc(
        "is_platform_admin"
      );

      if (adminCheckError || !isAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
    }

    // ── Student enrollment gate ──────────────────────────────────────────
    // Teachers may only access /students while their school's enrollment
    // workflow is open (schools.student_enrollment_enabled). This is a UX
    // redirect only — the authoritative check is Supabase RLS
    // (my_school_enrollment_enabled()), which blocks writes regardless of
    // whether this middleware runs. Principals/admins are never restricted
    // here; they always have /students access.
    const isStudentsRoute =
      pathname === "/students" || pathname.startsWith("/students/");

    if (user && isStudentsRoute) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "teacher") {
        const { data: enrollmentEnabled, error: enrollmentError } =
          await supabase.rpc("my_school_enrollment_enabled");

        // Fail closed: if the check itself errors, treat enrollment as
        // closed rather than letting a teacher through on an RPC failure.
        if (enrollmentError || !enrollmentEnabled) {
          const url = request.nextUrl.clone();
          url.pathname = "/teacher-dashboard";
          url.searchParams.set("enrollment", "closed");
          return NextResponse.redirect(url);
        }
      }
    }

    return response;
  } catch (err) {
    console.error("Middleware auth check failed:", err);
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