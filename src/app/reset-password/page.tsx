"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, Loader2, CheckCircle2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import TimeOfDayBackground from "@/components/TimeOfDayBackground";

export default function ResetPasswordPage() {
  const supabase = createClient();

  // Whether Supabase has recognized the recovery link and established a
  // temporary session for us. Until this is true, there's nothing valid to
  // submit a new password against.
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // The recovery link puts an access token in the URL. supabase-js parses
    // it automatically on load and fires PASSWORD_RECOVERY once the session
    // is established — that's the reliable signal to show the form.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setChecking(false);
      }
    });

    // Fallback: if the event already fired before this component mounted
    // (e.g. fast page load), a session will already be present.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSuccess(true);
      await supabase.auth.signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <TimeOfDayBackground />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-eduke-green rounded-2xl p-3 mb-3">
            <GraduationCap size={32} className="text-eduke-gold" />
          </div>
          <h1 className="text-xl font-bold text-white drop-shadow-sm">EduKe</h1>
          <p className="text-sm text-white/80 text-center mt-1 drop-shadow-sm">
            Choose a new password
          </p>
        </div>

        {success ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-4 text-center">
            <CheckCircle2 size={40} className="mx-auto text-eduke-green" />
            <p className="text-sm text-gray-700">
              Your password has been updated. You can now log in with it.
            </p>
            <Link
              href="/login"
              className="inline-block w-full bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm hover:bg-eduke-green-dark transition-colors"
            >
              Go to Login
            </Link>
          </div>
        ) : checking ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Checking your reset link...
          </div>
        ) : !ready ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-4 text-center">
            <p className="text-sm text-gray-700">
              This reset link is invalid or has expired.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block w-full bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm hover:bg-eduke-green-dark transition-colors"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-4"
          >
            <div>
              <label className="text-sm font-medium text-gray-700">New password</label>
              <input
                type="password"
                required
                value={password}
                disabled={loading}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Confirm new password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                disabled={loading}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green disabled:bg-gray-50"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm hover:bg-eduke-green-dark transition-colors disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}