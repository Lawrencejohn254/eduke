"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Loader2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import TimeOfDayBackground from "@/components/TimeOfDayBackground";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [showLinkChildHelp, setShowLinkChildHelp] =
    useState(false);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setShowLinkChildHelp(false);

    try {
      const supabase = createClient();

      const normalizedEmail =
        email.trim().toLowerCase();

      /*
       * ==========================================
       * STEP 1: PASSWORD AUTHENTICATION
       * ==========================================
       */

      const {
        data,
        error: loginError,
      } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (loginError) {
        throw new Error(
          "Invalid email or password."
        );
      }

      if (!data.user) {
        throw new Error(
          "Unable to log in."
        );
      }

      /*
       * ==========================================
       * STEP 2: GET PROFILE
       * ==========================================
       */

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          `
          role,
          school_id,
          first_name,
          last_name,
          staff_id,
          account_status
          `
        )
        .eq("id", data.user.id)
        .single();

      /*
       * Platform Admin
       */

      if (profileError || !profile) {
        // Note: intentionally NOT signing out here. A parent who signed up
        // but never finished phone verification will have an auth session
        // with no profiles row yet — signing them out would strand them,
        // since /link-child requires an active session to resume.
        setShowLinkChildHelp(true);
        throw new Error(
          "Your account isn't fully set up yet."
        );
      }

      /*
       * ==========================================
       * STEP 3: ACCOUNT STATUS
       * ==========================================
       */

      if (
        profile.account_status ===
        "pending"
      ) {
        await supabase.auth.signOut();

        if (profile.role === "parent") {
          throw new Error(
            "Your account isn't linked to a student yet. Please finish signing up to continue."
          );
        }

        throw new Error(
          "Your account is pending approval from your school administrator."
        );
      }

      if (
        profile.account_status ===
        "deactivated"
      ) {
        await supabase.auth.signOut();

        throw new Error(
          "Your account has been deactivated. Please contact your school administrator."
        );
      }

      /*
       * ==========================================
       * STEP 4: STAFF STATUS
       * ==========================================
       */

      if (profile.staff_id) {
        const {
          data: staffMember,
          error: staffError,
        } = await supabase
          .from("staff")
          .select("status")
          .eq(
            "id",
            profile.staff_id
          )
          .single();

        if (staffError) {
          console.error(
            "Staff status check error:",
            staffError
          );
        }

        if (staffMember?.status) {
          const staffStatus =
            staffMember.status
              .toLowerCase()
              .trim();

          const blockedStatuses = [
            "inactive",
            "deactivated",
            "suspended",
            "terminated",
          ];

          if (
            blockedStatuses.includes(
              staffStatus
            )
          ) {
            await supabase.auth.signOut();

            throw new Error(
              `Your staff account is currently ${staffStatus}. Please contact your school administrator.`
            );
          }
        }
      }

      /*
       * ==========================================
       * STEP 5: SEND LOGIN OTP
       * ==========================================
       */

      const response = await fetch(
        "/api/auth/send-login-otp",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            userId: data.user.id,

            email:
              data.user.email ??
              normalizedEmail,

            firstName:
              profile.first_name ??
              "",
          }),
        }
      );

      const otpResult =
        await response.json();

      if (!response.ok) {
        console.error(
          "OTP error:",
          otpResult
        );

        await supabase.auth.signOut();

        throw new Error(
          otpResult.error ??
            "Could not send verification code."
        );
      }

      /*
       * ==========================================
       * STEP 6: LOG LOGIN ATTEMPT
       *
       * Note:
       * We don't consider this a successful login
       * yet. OTP verification is still pending.
       * ==========================================
       */

      /*
       * ==========================================
       * STEP 7: GO TO OTP VERIFICATION
       * ==========================================
       */

      router.push(
        `/verify-login?email=${encodeURIComponent(
          data.user.email ??
            normalizedEmail
        )}`
      );

    } catch (err) {
      console.error(
        "Login error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while logging in."
      );

      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">

      <TimeOfDayBackground />

      <div className="relative z-10 w-full max-w-sm">

        {/* LOGO */}

        <div className="flex flex-col items-center mb-6">

          <div className="bg-eduke-green rounded-2xl p-3 mb-3">

            <GraduationCap
              size={32}
              className="text-eduke-gold"
            />

          </div>

          <h1 className="text-xl font-bold text-white drop-shadow-sm">
            EduKe
          </h1>

          <p className="text-sm text-white/80 text-center mt-1 drop-shadow-sm">
            School management for Kenyan primary &amp;
            secondary schools 🇰🇪
          </p>

        </div>


        {/* LOGIN FORM */}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-4"
        >

          {/* EMAIL */}

          <div>

            <label className="text-sm font-medium text-gray-700">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              disabled={loading}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              placeholder="you@school.ac.ke"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green disabled:bg-gray-50"
            />

          </div>


          {/* PASSWORD */}

          <div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Password
              </label>

              <Link
                href="/forgot-password"
                className="text-xs font-medium text-eduke-green hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <input
              type="password"
              required
              value={password}
              disabled={loading}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green disabled:bg-gray-50"
            />

          </div>


          {/* ERROR */}

          {error && (

            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-600">

              {error}

              {showLinkChildHelp && (
                <Link
                  href="/link-child"
                  className="mt-2 block font-semibold underline"
                >
                  Continue linking your child &rarr;
                </Link>
              )}

            </div>

          )}


          {/* LOGIN BUTTON */}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm hover:bg-eduke-green-dark transition-colors disabled:opacity-60"
          >

            {loading && (

              <Loader2
                size={16}
                className="animate-spin"
              />

            )}

            {loading
              ? "Sending verification code..."
              : "Log in"}

          </button>

        </form>


        {/* REGISTRATION */}

        <div className="mt-6 space-y-4 text-center">

          <div>

            <p className="text-sm text-white/80 drop-shadow-sm">
              Are you a staff member?
            </p>

            <Link
              href="/create-account"
              className="mt-1 inline-block text-sm font-semibold text-white hover:underline drop-shadow-sm"
            >
              Create Staff Account
            </Link>

          </div>


          <div className="border-t border-white/20 pt-4">

            <p className="text-sm text-white/80 drop-shadow-sm">
              Are you a parent?
            </p>

            <Link
              href="/create-parent-account"
              className="mt-1 inline-block text-sm font-semibold text-white hover:underline drop-shadow-sm"
            >
              Create Parent Account
            </Link>

          </div>


          <div className="border-t border-white/20 pt-4">

            <p className="text-sm text-white/80 drop-shadow-sm">
              Is your school new to EduKe?
            </p>

            <Link
              href="/signup"
              className="mt-1 inline-block text-sm font-semibold text-white hover:underline drop-shadow-sm"
            >
              Register Your School
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}