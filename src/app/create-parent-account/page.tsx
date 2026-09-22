"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { GraduationCap, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import TimeOfDayBackground from "@/components/TimeOfDayBackground";

export default function CreateParentAccountPage() {
  const router = useRouter();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shown only if Supabase Auth requires email confirmation before
  // returning a session (project-config dependent). This project sends a
  // clickable confirmation link, not an OTP code.
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);
  const [resending, setResending] = useState(false);

  const [turnstileToken, setTurnstileToken] =
    useState<string | null>(null);

  useEffect(() => {
    (window as any).onTurnstileVerifyParent = (token: string) => {
      setTurnstileToken(token);
    };
  }, []);

  async function startGuardianLinking() {
    const { data: fnData, error: fnError } =
      await supabase.functions.invoke("parent-request-otp", {
        body: { phone, firstName, lastName },
      });

    if (fnError) {
      throw new Error(
        "Account created, but we couldn't start the linking step. Please try again from the sign-in screen."
      );
    }

    const params = new URLSearchParams({ phone });

    if (fnData?.matched) {
      router.push(`/link-child/verify?${params.toString()}`);
    } else {
      router.push(`/link-child/request-access?${params.toString()}`);
    }
  }

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
      if (!phone.trim()) {
        throw new Error("Phone number is required.");
      }
      if (!turnstileToken) {
        throw new Error("Please complete the verification checkbox.");
      }

      const verifyRes = await fetch("/api/auth/verify-turnstile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: turnstileToken }),
      });

      if (!verifyRes.ok) {
        throw new Error("Verification failed. Please try again.");
      }

      const normalizedEmail = email.trim().toLowerCase();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (!data.session) {
        // Email confirmation is required before a session exists.
        setAwaitingEmailConfirm(true);
        setLoading(false);
        return;
      }

      await startGuardianLinking();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong while creating your account."
      );
      setLoading(false);
    }
  }

  async function handleContinueAfterConfirm() {
    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError || !data.session) {
        throw new Error(
          "Email not confirmed yet. Please click the link in your email first, then try again."
        );
      }

      await startGuardianLinking();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  async function handleResendConfirmEmail() {
    setResending(true);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
      });
      if (resendError) {
        throw new Error(resendError.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the email.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />

      <TimeOfDayBackground />

      <div className="relative z-10 w-full max-w-sm">
        {/* LOGO */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-eduke-green rounded-2xl p-3 mb-3">
            <GraduationCap size={32} className="text-eduke-gold" />
          </div>
          <h1 className="text-xl font-bold text-white drop-shadow-sm">EduKe</h1>
          <p className="text-sm text-white/80 text-center mt-1 drop-shadow-sm">
            Create your parent account
          </p>
        </div>

        {awaitingEmailConfirm ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-4 text-center">
            <p className="text-sm text-gray-700">
              We&apos;ve sent a confirmation email to <strong>{email}</strong>. Open it and
              click the confirmation link, then come back here and continue.
            </p>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-600 text-left">
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={handleContinueAfterConfirm}
              className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm hover:bg-eduke-green-dark transition-colors disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Checking..." : "I've confirmed my email — continue"}
            </button>

            <button
              type="button"
              onClick={handleResendConfirmEmail}
              disabled={resending}
              className="w-full text-sm text-eduke-green hover:underline disabled:opacity-60"
            >
              {resending ? "Resending..." : "Resend confirmation email"}
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">First name</label>
                <input
                  type="text"
                  value={firstName}
                  disabled={loading}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Last name</label>
                <input
                  type="text"
                  value={lastName}
                  disabled={loading}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green disabled:bg-gray-50"
                />
              </div>
            </div>

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

            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                disabled={loading}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Password</label>
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
              <label className="text-sm font-medium text-gray-700">Confirm password</label>
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

            <div
              className="cf-turnstile"
              data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              data-callback="onTurnstileVerifyParent"
            />

            <button
              type="submit"
              disabled={loading || !turnstileToken}
              className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm hover:bg-eduke-green-dark transition-colors disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Creating account..." : "Create Parent Account"}
            </button>
          </form>
        )}

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