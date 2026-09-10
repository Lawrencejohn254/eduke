"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import TimeOfDayBackground from "@/components/TimeOfDayBackground";

const RESEND_COOLDOWN_SECONDS = 30;

function VerifyLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startCooldown(seconds: number) {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Your session expired. Please log in again.");
      }

      const response = await fetch("/api/auth/verify-login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, otp }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Verification failed.");
      }

      router.push(result.redirectTo || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    setResendMessage(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Your session expired. Please log in again.");
      }

      // First name is used server-side purely for email personalization —
      // fetch it fresh rather than assuming it's available client-side here.
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .maybeSingle();

      const response = await fetch("/api/auth/send-login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email ?? email,
          firstName: profile?.first_name ?? "",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Server-side rate limiting responds here (e.g. 429). Surface
        // whatever cooldown it reports rather than guessing client-side.
        if (response.status === 429 && result.retryAfterSeconds) {
          startCooldown(result.retryAfterSeconds);
        }
        throw new Error(result.error ?? "Could not resend the code.");
      }

      setOtp("");
      setResendMessage("A new code has been sent.");
      startCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the code.");
    } finally {
      setResending(false);
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
          <h1 className="text-xl font-bold text-white drop-shadow-sm">Verify it's you</h1>
          <p className="text-sm text-white/80 text-center mt-1 drop-shadow-sm">
            We sent a 6-digit code to {email || "your email"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-gray-700">Verification code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={otp}
              disabled={loading}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-eduke-green disabled:bg-gray-50"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          {resendMessage && !error && (
            <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2.5 text-sm text-green-700">
              {resendMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm hover:bg-eduke-green-dark transition-colors disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Verifying..." : "Verify & continue"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="w-full text-sm text-eduke-green hover:underline disabled:opacity-60 disabled:no-underline flex items-center justify-center gap-1.5"
          >
            {resending && <Loader2 size={13} className="animate-spin" />}
            {resending
              ? "Sending..."
              : cooldown > 0
              ? `Resend code in ${cooldown}s`
              : "Resend code"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function VerifyLoginPage() {
  return (
    <Suspense>
      <VerifyLoginForm />
    </Suspense>
  );
}