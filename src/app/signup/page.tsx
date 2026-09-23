"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import TimeOfDayBackground from "@/components/TimeOfDayBackground";
import TurnstileWidget from "@/components/TurnstileWidget";

const SCHOOL_TYPES = ["Public", "Private", "Mission", "International"];
const SCHOOL_LEVELS = ["Primary", "Secondary", "Both"];
const CURRICULA = ["CBC", "8-4-4"];

export default function SignupPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [turnstileToken, setTurnstileToken] =
    useState<string | null>(null);

  const [schoolName, setSchoolName] = useState("");
  const [county, setCounty] = useState("");
  const [subCounty, setSubCounty] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [schoolType, setSchoolType] = useState(SCHOOL_TYPES[1]);
  const [schoolLevel, setSchoolLevel] = useState(SCHOOL_LEVELS[1]);
  const [curriculum, setCurriculum] = useState(CURRICULA[0]);
  const [isBoarding, setIsBoarding] = useState(false);

  const [principalFirstName, setPrincipalFirstName] = useState("");
  const [principalLastName, setPrincipalLastName] = useState("");
  const [principalEmail, setPrincipalEmail] = useState("");
  const [principalPhone, setPrincipalPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!turnstileToken) {
      setError("Please complete the verification checkbox.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName,
          county,
          subCounty,
          schoolPhone,
          schoolEmail,
          schoolType,
          schoolLevel,
          curriculum,
          isBoarding,
          principalFirstName,
          principalLastName,
          principalEmail,
          principalPhone,
          password,
          turnstileToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Signup failed. Please try again.");
        return;
      }

      const supabase = createClient();

      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: principalEmail,
          password,
        });

      if (signInError) {
        setError(
          "Account created, but automatic sign-in failed. Please log in manually."
        );
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      {/* BACKGROUND */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <TimeOfDayBackground />
      </div>

      {/* CONTENT */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl">

          {/* HEADER */}
          <div className="flex flex-col items-center mb-6">
            <div className="bg-eduke-green rounded-2xl p-3 mb-3 shadow-lg">
              <GraduationCap
                size={32}
                className="text-eduke-gold"
              />
            </div>

            <h1 className="text-xl font-bold text-white drop-shadow-lg">
              Register Your School
            </h1>

            <p className="text-sm text-white text-center mt-2 max-w-lg leading-relaxed drop-shadow-lg">
              Create your EduKe school account. After registration,
              we'll send a confirmation link to your email address.
              Once your email is confirmed, your account will be
              reviewed by a platform administrator.
            </p>
          </div>

          {/* FORM CARD */}
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-2xl border border-white/80 p-7 md:p-8 space-y-6"
          >
            {/* SCHOOL DETAILS */}
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-3">
                School Details
              </p>

              <div className="space-y-3">
                <input
                  required
                  placeholder="School name"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    placeholder="County"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                  />

                  <input
                    placeholder="Sub-county"
                    value={subCounty}
                    onChange={(e) => setSubCounty(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    placeholder="School phone"
                    value={schoolPhone}
                    onChange={(e) => setSchoolPhone(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                  />

                  <input
                    type="email"
                    placeholder="School email"
                    value={schoolEmail}
                    onChange={(e) => setSchoolEmail(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={schoolType}
                    onChange={(e) => setSchoolType(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white text-gray-900 px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                  >
                    {SCHOOL_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>

                  <select
                    value={schoolLevel}
                    onChange={(e) => setSchoolLevel(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white text-gray-900 px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                  >
                    {SCHOOL_LEVELS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>

                  <select
                    value={curriculum}
                    onChange={(e) => setCurriculum(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white text-gray-900 px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                  >
                    {CURRICULA.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isBoarding}
                    onChange={(e) =>
                      setIsBoarding(e.target.checked)
                    }
                    className="accent-eduke-green"
                  />
                  This is a boarding school
                </label>
              </div>
            </div>

            {/* PRINCIPAL DETAILS */}
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-3">
                Your Details (Principal)
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    required
                    placeholder="First name"
                    value={principalFirstName}
                    onChange={(e) =>
                      setPrincipalFirstName(e.target.value)
                    }
                    className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                  />

                  <input
                    required
                    placeholder="Last name"
                    value={principalLastName}
                    onChange={(e) =>
                      setPrincipalLastName(e.target.value)
                    }
                    className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                  />
                </div>

                <input
                  required
                  type="email"
                  placeholder="Your login email"
                  value={principalEmail}
                  onChange={(e) =>
                    setPrincipalEmail(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                />

                <input
                  placeholder="Your phone"
                  value={principalPhone}
                  onChange={(e) =>
                    setPrincipalPhone(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    required
                    type="password"
                    placeholder="Password (min 8 characters)"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                  />

                  <input
                    required
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    className="rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                  />
                </div>
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* TURNSTILE WIDGET */}
            <TurnstileWidget onVerify={setTurnstileToken} />

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={saving || !turnstileToken}
              className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-3 text-sm hover:bg-eduke-green-dark transition-colors disabled:opacity-60"
            >
              {saving && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {saving
                ? "Submitting..."
                : "Submit for Approval"}
            </button>
          </form>

          {/* LOGIN */}
          <div className="mt-6 text-center">
            <p className="text-sm text-white drop-shadow-lg">
              Already have an account?
            </p>

            <Link
              href="/login"
              className="mt-1 inline-block text-sm font-semibold text-white underline underline-offset-2 hover:text-eduke-gold transition-colors drop-shadow-lg"
            >
              Back to login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}