"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const DEMO_ACCOUNTS = [
  { label: "Principal", email: "principal@greenfield.ac.ke" },
  { label: "Teacher", email: "teacher@greenfield.ac.ke" },
  { label: "HOD", email: "hod@greenfield.ac.ke" },
  { label: "Bursar", email: "bursar@greenfield.ac.ke" },
  { label: "Parent", email: "parent@greenfield.ac.ke" },
];

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Authenticate user
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Unable to log in.");
        setLoading(false);
        return;
      }

      // Get user profile
      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "role, school_id, first_name, last_name, staff_id, account_status"
          )
          .eq("id", data.user.id)
          .single();

      // Platform admin accounts may not have a normal profile
      if (profileError || !profile) {
        router.push("/platform-admin");
        router.refresh();
        return;
      }

      // ==========================================
      // BLOCK PENDING ACCOUNTS
      // ==========================================

      if (profile.account_status === "pending") {
        await supabase.auth.signOut();

        setError(
          "Your account is still pending approval from your school administrator."
        );

        setLoading(false);
        return;
      }

      // ==========================================
      // BLOCK DEACTIVATED ACCOUNTS
      // ==========================================

      if (profile.account_status === "deactivated") {
        await supabase.auth.signOut();

        setError(
          "Your account has been deactivated. Please contact your school administrator."
        );

        setLoading(false);
        return;
      }

      // ==========================================
// CHECK STAFF EMPLOYMENT STATUS
// ==========================================

      if (profile.staff_id) {
        const { data: staffMember, error: staffError } = await supabase
          .from("staff")
          .select("status")
          .eq("id", profile.staff_id)
          .single();

        if (staffError) {
          console.error("Staff status check error:", staffError);
        }

        if (staffMember?.status) {
          const staffStatus = staffMember.status.toLowerCase().trim();

          const blockedStatuses = [
            "inactive",
            "deactivated",
            "suspended",
            "terminated",
          ];

          if (blockedStatuses.includes(staffStatus)) {
            await supabase.auth.signOut();

            setError(
              `Your account is currently ${staffStatus}. Please contact your school administrator.`
            );

            setLoading(false);
            return;
          }
        }
      }

      // ==========================================
      // LOG SUCCESSFUL LOGIN
      // ==========================================

      try {
        await supabase.from("login_sessions").insert({
          school_id: profile.school_id,
          user_id: data.user.id,
          user_name:
            `${profile.first_name ?? ""} ${
              profile.last_name ?? ""
            }`.trim(),
          user_role: profile.role,
          user_agent:
            typeof navigator !== "undefined"
              ? navigator.userAgent
              : null,
        });
      } catch {
        // Login logging should never block access
      }

      // ==========================================
      // REDIRECT USER BY ROLE
      // ==========================================

      if (profile.role === "parent") {
        router.push("/parent");
      } else if (
        profile.role === "teacher" ||
        profile.role === "hod"
      ) {
        router.push("/teacher-dashboard");
      } else {
        router.push("/dashboard");
      }

      router.refresh();

    } catch (err) {
      console.error("Login error:", err);

      setError(
        "Something went wrong while logging in. Please try again."
      );

      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-eduke-bg px-4">
      <div className="w-full max-w-sm">

        {/* LOGO */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-eduke-green rounded-2xl p-3 mb-3">
            <GraduationCap
              size={32}
              className="text-eduke-gold"
            />
          </div>

          <h1 className="text-xl font-bold text-eduke-green">
            EduKe
          </h1>

          <p className="text-sm text-gray-500 text-center mt-1">
            School management for Kenyan primary &amp; secondary schools 🇰🇪
          </p>
        </div>

        {/* LOGIN FORM */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4"
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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.ac.ke"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
            />
          </div>

          {/* ERROR MESSAGE */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-600">
              {error}
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

            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        {/* REGISTRATION LINKS */}
        <div className="mt-6 space-y-4 text-center">

          {/* STAFF REGISTRATION */}
          <div>
            <p className="text-sm text-gray-500">
              Are you a staff member?
            </p>

            <Link
              href="/create-account"
              className="mt-1 inline-block text-sm font-semibold text-eduke-green hover:underline"
            >
              Create Staff Account
            </Link>
          </div>

          {/* SCHOOL REGISTRATION */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500">
              Is your school new to EduKe?
            </p>

            <Link
              href="/signup"
              className="mt-1 inline-block text-sm font-semibold text-eduke-green hover:underline"
            >
              Register Your School
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}