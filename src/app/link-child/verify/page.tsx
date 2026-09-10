"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Loader2, CheckCircle2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import TimeOfDayBackground from "@/components/TimeOfDayBackground";

function VerifyLinkForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const phone = searchParams.get("phone") ?? "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "parent-verify-otp",
        { body: { phone, code } }
      );

      if (fnError || !data?.success) {
        throw new Error(data?.message ?? "Verification failed. Please try again.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "parent-request-otp",
        { body: { phone } }
      );

      if (fnError || !data?.matched) {
        throw new Error(data?.message ?? "Could not resend the code.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
          <h1 className="text-xl font-bold text-white drop-shadow-sm">EduKe</h1>
          <p className="text-sm text-white/80 text-center mt-1 drop-shadow-sm">
            Verify it&apos;s you
          </p>
        </div>

        {success ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-4 text-center">
            <CheckCircle2 size={40} className="mx-auto text-eduke-green" />
            <p className="text-sm text-gray-700">
              Your account is linked to your child&apos;s records.
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
            <p className="text-sm text-gray-600">
              We sent a 6-digit code to <strong>{phone}</strong>.
            </p>

            <div>
              <label className="text-sm font-medium text-gray-700">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={code}
                disabled={loading}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-eduke-green disabled:bg-gray-50"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm hover:bg-eduke-green-dark transition-colors disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Verifying..." : "Verify & Link Account"}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full text-sm text-eduke-green hover:underline disabled:opacity-60"
            >
              {resending ? "Resending..." : "Resend code"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-white/80 drop-shadow-sm">
            Wrong number, or no code arriving?
          </p>
          <Link
            href={`/link-child/request-access?phone=${encodeURIComponent(phone)}`}
            className="mt-1 inline-block text-sm font-semibold text-white hover:underline drop-shadow-sm"
          >
            Request manual verification
          </Link>
        </div>
        <div className="mt-6 text-center">
          <p className="text-sm text-white/80 drop-shadow-sm">Already have an account?</p>
          <Link
            href="/login"
            className="mt-1 inline-block text-sm font-semibold text-white hover:underline drop-shadow-sm"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyLinkPage() {
  return (
    <Suspense fallback={null}>
      <VerifyLinkForm />
    </Suspense>
  );
}