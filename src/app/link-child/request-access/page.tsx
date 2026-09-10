"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Loader2, CheckCircle2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import TimeOfDayBackground from "@/components/TimeOfDayBackground";
import SchoolSearchInput from "@/components/SchoolSearchInput";

const RELATIONSHIPS = [
  "Father",
  "Mother",
  "Guardian",
  "Uncle",
  "Aunt",
  "Grandparent",
  "Other",
];

type School = { id: string; name: string; county: string | null; sub_county: string | null };

function RequestAccessForm() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("Guardian");
  const [studentName, setStudentName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedSchool) {
      setError("Please search for and select your child's school.");
      return;
    }

    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error("You need to be signed in to submit this request. Please log in first.");
      }

      const { error: insertError } = await supabase.from("guardian_link_requests").insert({
        auth_user_id: userData.user.id,
        school_id: selectedSchool.id,
        full_name: fullName,
        phone,
        email: email || null,
        relationship,
        student_full_name_hint: studentName || null,
        student_admission_number_hint: admissionNumber || null,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSuccess(true);
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
            Request manual verification
          </p>
        </div>

        {success ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-4 text-center">
            <CheckCircle2 size={40} className="mx-auto text-eduke-green" />
            <p className="text-sm text-gray-700">
              Your request has been submitted. Your child&apos;s school will review it and
              activate your account.
            </p>
            <Link
              href="/login"
              className="inline-block w-full bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm hover:bg-eduke-green-dark transition-colors"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-4"
          >
            <p className="text-xs text-gray-500">
              We couldn&apos;t automatically match your phone number to a student record.
              Fill this in and your child&apos;s school will verify and activate your account.
            </p>

            <div>
              <label className="text-sm font-medium text-gray-700">Your full name</label>
              <input
                type="text"
                required
                value={fullName}
                disabled={loading}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Phone number</label>
              <input
                type="tel"
                required
                value={phone}
                disabled={loading}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Email (optional)</label>
              <input
                type="email"
                value={email}
                disabled={loading}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Relationship to student</label>
              <select
                value={relationship}
                disabled={loading}
                onChange={(e) => setRelationship(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green disabled:bg-gray-50"
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">School</label>
              <div className="mt-1">
                <SchoolSearchInput value={selectedSchool} onChange={setSelectedSchool} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Child&apos;s full name (optional)
              </label>
              <input
                type="text"
                value={studentName}
                disabled={loading}
                onChange={(e) => setStudentName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Admission number (optional)
              </label>
              <input
                type="text"
                value={admissionNumber}
                disabled={loading}
                onChange={(e) => setAdmissionNumber(e.target.value)}
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
              {loading ? "Submitting..." : "Submit for Review"}
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

export default function RequestAccessPage() {
  return (
    <Suspense fallback={null}>
      <RequestAccessForm />
    </Suspense>
  );
}