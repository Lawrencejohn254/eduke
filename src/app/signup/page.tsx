"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const SCHOOL_TYPES = ["Public", "Private", "Mission", "International"];
const SCHOOL_LEVELS = ["Primary", "Secondary", "Both"];
const CURRICULA = ["CBC", "8-4-4"];

export default function SignupPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setSaving(true);

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
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setSaving(false);
      setError(data.error ?? "Signup failed. Please try again.");
      return;
    }

    // Immediately sign the principal in — getProfileOrRedirect() will route them to
    // /pending-approval automatically since they have no profile yet.
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: principalEmail, password });
    setSaving(false);

    if (signInError) {
      setError("Account created, but automatic sign-in failed. Please log in manually.");
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-eduke-bg px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-eduke-green rounded-2xl p-3 mb-3">
            <GraduationCap size={32} className="text-eduke-gold" />
          </div>
          <h1 className="text-xl font-bold text-eduke-green">Register Your School</h1>
          <p className="text-sm text-gray-500 text-center mt-1">
            Submit your school's details below. A platform administrator will review and approve your account before you can log in.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">School Details</p>
            <div className="space-y-3">
              <input required placeholder="School name" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="County" value={county} onChange={(e) => setCounty(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <input placeholder="Sub-county" value={subCounty} onChange={(e) => setSubCounty(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="School phone" value={schoolPhone} onChange={(e) => setSchoolPhone(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <input placeholder="School email" value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <select value={schoolType} onChange={(e) => setSchoolType(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-2 text-sm">
                  {SCHOOL_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <select value={schoolLevel} onChange={(e) => setSchoolLevel(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-2 text-sm">
                  {SCHOOL_LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
                <select value={curriculum} onChange={(e) => setCurriculum(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-2 text-sm">
                  {CURRICULA.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={isBoarding} onChange={(e) => setIsBoarding(e.target.checked)} />
                This is a boarding school
              </label>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Your Details (Principal)</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="First name" value={principalFirstName} onChange={(e) => setPrincipalFirstName(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <input required placeholder="Last name" value={principalLastName} onChange={(e) => setPrincipalLastName(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <input required type="email" placeholder="Your login email" value={principalEmail} onChange={(e) => setPrincipalEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="Your phone" value={principalPhone} onChange={(e) => setPrincipalPhone(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input required type="password" placeholder="Password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <input required type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm hover:bg-eduke-green-dark transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="animate-spin" />} Submit for Approval
          </button>
        </form>
      </div>
    </div>
  );
}