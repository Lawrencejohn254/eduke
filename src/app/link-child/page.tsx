"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import TimeOfDayBackground from "@/components/TimeOfDayBackground";

export default function LinkChildPage() {
  const router = useRouter();
  const supabase = createClient();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getUser();
      setHasSession(!!data?.user);
      setCheckingSession(false);
    }
    checkSession();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "parent-request-otp",
        { body: { phone } }
      );

      if (fnError) {
        throw new Error("Could not start the linking step. Please try again.");
      }

      const params = new URLSearchParams({ phone });

      if (data?.matched) {
        router.push(`/link-child/verify?${params.toString()}`);
      } else {
        router.push(`/link-child/request-access?${params.toString()}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
            Link your child&apos;s record
          </p>
        </div>

        {checkingSession ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 text-center text-sm text-gray-500">
            Checking your session...
          </div>
        ) : !hasSession ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-4 text-center">
            <p className="text-sm text-gray-700">
              You need to be signed in to link a child. If you&apos;ve already created an
              account, log in first.
            </p>
            <Link
              href="/login"
              className="inline-block w-full bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm hover:bg-eduke-green-dark transition-colors"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-4"
          >
            <div>
              <label className="text-sm font-medium text-gray-700">Phone number</label>
              <input
                type="tel"
                required
                value={phone}
                disabled={loading}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green disabled:bg-gray-50"
              />
              <p className="mt-1 text-xs text-gray-400">
                Use the same number your child&apos;s school has on file for you.
              </p>
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
              {loading ? "Sending code..." : "Send verification code"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}