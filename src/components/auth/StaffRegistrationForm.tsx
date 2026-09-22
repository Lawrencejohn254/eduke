"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { departmentOptionsForRole } from "@/lib/departments";

type School = {
  id: string;
  name: string;
  county: string | null;
  school_type: string | null;
};

const ROLES = [
  "teacher",
  "hod",
  "deputy_principal",
  "bursar",
  "librarian",
  "support_staff",
];

export default function StaffRegistrationForm() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [gender, setGender] = useState("");
  const [role, setRole] = useState("teacher");
  const [department, setDepartment] = useState("");
  const [tscNumber, setTscNumber] = useState("");
  const [contractType, setContractType] = useState("");

  const [schoolQuery, setSchoolQuery] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] =
    useState<School | null>(null);

  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [turnstileToken, setTurnstileToken] =
    useState<string | null>(null);

  useEffect(() => {
    (window as any).onTurnstileVerifyStaff = (token: string) => {
      setTurnstileToken(token);
    };
  }, []);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    if (selectedSchool) return;

    const searchSchools = async () => {
      if (schoolQuery.trim().length < 2) {
        setSchools([]);
        return;
      }

      setSearching(true);

      try {
        const response = await fetch(
          `/api/public/schools/search?q=${encodeURIComponent(
            schoolQuery
          )}`
        );

        const data = await response.json();

        setSchools(data.schools ?? []);
      } catch {
        setSchools([]);
      } finally {
        setSearching(false);
      }
    };

    const timeout = setTimeout(searchSchools, 350);

    return () => clearTimeout(timeout);
  }, [schoolQuery, selectedSchool]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError(null);

    if (!selectedSchool) {
      setError(
        "Please select a registered school before continuing."
      );
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!turnstileToken) {
      setError("Please complete the verification checkbox.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/auth/register-staff",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            phone,
            password,

            gender,
            requestedRole: role,
            department,
            tscNumber,
            contractType,

            schoolId: selectedSchool.id,

            turnstileToken,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ?? "Unable to create your account."
        );
        return;
      }

      router.push("/pending-approval");
    } catch {
      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />

      {/* PERSONAL INFORMATION */}
      <section>
        <h2 className="font-semibold text-gray-900 mb-4">
          Personal Information
        </h2>

        <div className="grid md:grid-cols-2 gap-4">

          <input
            required
            placeholder="First Name"
            value={firstName}
            onChange={(e) =>
              setFirstName(e.target.value)
            }
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />

          <input
            required
            placeholder="Last Name"
            value={lastName}
            onChange={(e) =>
              setLastName(e.target.value)
            }
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />

          <input
            required
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />

          <input
            required
            placeholder="Phone Number"
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value)
            }
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />

          <select
            required
            value={gender}
            onChange={(e) =>
              setGender(e.target.value)
            }
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <input
            required
            type="password"
            placeholder="Create Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />

          <div>
            <input
              required
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              className={`w-full rounded-lg border px-3 py-2.5 text-sm ${
                passwordsMismatch
                  ? "border-red-400 focus:outline-red-400"
                  : passwordsMatch
                  ? "border-eduke-green focus:outline-eduke-green"
                  : "border-gray-300"
              }`}
            />
            {passwordsMismatch && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <XCircle size={13} /> Passwords do not match
              </p>
            )}
            {passwordsMatch && (
              <p className="mt-1 text-xs text-eduke-green flex items-center gap-1">
                <CheckCircle2 size={13} /> Passwords match
              </p>
            )}
          </div>

        </div>
      </section>

      {/* SCHOOL SEARCH */}
      <section className="relative">
        <h2 className="font-semibold text-gray-900 mb-4">
          Find Your School
        </h2>

        {selectedSchool ? (
          <div className="border border-eduke-green bg-eduke-green/5 rounded-xl p-4 flex justify-between items-center">

            <div>
              <div className="flex items-center gap-2 font-medium text-gray-900">
                <CheckCircle2
                  size={18}
                  className="text-eduke-green"
                />

                {selectedSchool.name}
              </div>

              <p className="text-xs text-gray-500 mt-1">
                {selectedSchool.county} ·{" "}
                {selectedSchool.school_type}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedSchool(null);
                setSchoolQuery("");
              }}
              className="text-sm text-red-600"
            >
              Change
            </button>

          </div>
        ) : (
          <>
            <div className="relative">

              <Search
                size={18}
                className="absolute left-3 top-3 text-gray-400"
              />

              <input
                required
                placeholder="Start typing your school name..."
                value={schoolQuery}
                onChange={(e) =>
                  setSchoolQuery(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-sm"
              />

              {searching && (
                <Loader2
                  size={17}
                  className="animate-spin absolute right-3 top-3 text-gray-400"
                />
              )}

            </div>

            {schoolQuery.length >= 2 && !searching && (
              <div className="border border-gray-200 rounded-lg mt-2 overflow-hidden">

                {schools.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">
                    <p className="font-medium text-gray-700">
                      School not yet registered.
                    </p>

                    <p className="mt-1">
                      Please contact your school principal to
                      register the school first.
                    </p>
                  </div>
                ) : (
                  schools.map((school) => (
                    <button
                      type="button"
                      key={school.id}
                      onClick={() => {
                        setSelectedSchool(school);
                        setSchools([]);
                      }}
                      className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-0"
                    >
                      <p className="font-medium text-sm text-gray-900">
                        {school.name}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {school.county} · {school.school_type}
                      </p>
                    </button>
                  ))
                )}

              </div>
            )}
          </>
        )}
      </section>

      {/* PROFESSIONAL INFORMATION */}
      <section>
        <h2 className="font-semibold text-gray-900 mb-4">
          Professional Information
        </h2>

        <div className="grid md:grid-cols-2 gap-4">

          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setDepartment("");
            }}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role
                  .replaceAll("_", " ")
                  .replace(/\b\w/g, (c) =>
                    c.toUpperCase()
                  )}
              </option>
            ))}
          </select>

          <select
            value={department}
            onChange={(e) =>
              setDepartment(e.target.value)
            }
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          >
            <option value="">
              Select Department
            </option>

            {departmentOptionsForRole(role).map((department) => (
              <option
                key={department}
                value={department}
              >
                {department}
              </option>
            ))}
          </select>

          <input
            placeholder="TSC Number (optional)"
            value={tscNumber}
            onChange={(e) =>
              setTscNumber(e.target.value)
            }
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />

          <select
            value={contractType}
            onChange={(e) =>
              setContractType(e.target.value)
            }
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          >
            <option value="">
              Contract Type
            </option>

            <option value="Permanent">
              Permanent
            </option>

            <option value="Contract">
              Contract
            </option>

            <option value="Internship">
              Internship
            </option>
          </select>

        </div>
      </section>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <div
        className="cf-turnstile"
        data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        data-callback="onTurnstileVerifyStaff"
      />

      <button
        type="submit"
        disabled={saving || !turnstileToken}
        className="w-full bg-eduke-green text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {saving && (
          <Loader2
            size={18}
            className="animate-spin"
          />
        )}

        {saving
          ? "Creating Account..."
          : "Create Account"}
      </button>

      <div className="text-center">
        <p className="text-sm text-gray-500">Already have an account?</p>
        <Link
          href="/login"
          className="mt-1 inline-block text-sm font-semibold text-eduke-green hover:underline"
        >
          Back to login
        </Link>
      </div>

    </form>

  );
}