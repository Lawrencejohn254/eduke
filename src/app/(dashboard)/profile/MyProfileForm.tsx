"use client";

import { useState } from "react";
import {
  User,
  School,
  Briefcase,
  Save,
  Loader2,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ProfilePhotoUpload from "@/components/profile/ProfilePhotoUpload";

type Props = {
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    photo_url: string | null;
    role: string;
    school_name: string | null;
  };
  staff: {
    gender: string | null;
    department: string | null;
    staff_number: string | null;
  };
};

export default function MyProfileForm({
  profile,
  staff,
}: Props) {
  const [firstName, setFirstName] = useState(
    profile.first_name ?? ""
  );

  const [lastName, setLastName] = useState(
    profile.last_name ?? ""
  );

  const [phone, setPhone] = useState(
    profile.phone ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
        })
        .eq("id", profile.id);

      if (error) {
        setError(error.message);
        return;
      }

      setMessage("Profile updated successfully.");
    } catch {
      setError("Unable to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* PROFILE PHOTO */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <User size={20} className="text-eduke-green" />

          <div>
            <h2 className="font-semibold text-gray-900">
              Profile Photo
            </h2>

            <p className="text-xs text-gray-500">
              Upload or change your profile photo.
            </p>
          </div>
        </div>

        <ProfilePhotoUpload
          userId={profile.id}
          currentPhotoUrl={profile.photo_url}
        />
      </div>

      {/* PERSONAL INFORMATION */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-xl border border-gray-100 p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <User size={20} className="text-eduke-green" />

          <div>
            <h2 className="font-semibold text-gray-900">
              Personal Information
            </h2>

            <p className="text-xs text-gray-500">
              Update your personal details.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">

          <div>
            <label className="text-sm font-medium text-gray-700">
              First Name
            </label>

            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Last Name
            </label>

            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Phone Number
            </label>

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712 345 678"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
            />
          </div>

        </div>

        {error && (
          <div className="mt-5 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-eduke-green text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-eduke-green-dark disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Save size={17} />
            )}

            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* ACCOUNT INFORMATION */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Briefcase size={20} className="text-eduke-green" />

          <div>
            <h2 className="font-semibold text-gray-900">
              Account Information
            </h2>

            <p className="text-xs text-gray-500">
              Information managed by your school administrator.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">

          <InfoRow
            icon={<School size={16} />}
            label="School"
            value={profile.school_name ?? "Not assigned"}
          />

          <InfoRow
            icon={<Briefcase size={16} />}
            label="Role"
            value={profile.role.replaceAll("_", " ")}
          />

          <InfoRow
            icon={<User size={16} />}
            label="Department"
            value={staff.department ?? "Not assigned"}
          />

          <InfoRow
            icon={<User size={16} />}
            label="Staff Number"
            value={staff.staff_number ?? "Not assigned"}
          />

        </div>
      </div>

      {/* SECURITY */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={20} className="text-eduke-green" />

          <div>
            <h2 className="font-semibold text-gray-900">
              Security
            </h2>

            <p className="text-xs text-gray-500">
              Manage your account security.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            alert("Password change will be added next.")
          }
          className="text-sm font-medium text-eduke-green hover:underline"
        >
          Change Password
        </button>
      </div>

    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gray-400">
        {icon}
      </div>

      <div>
        <p className="text-xs text-gray-500">
          {label}
        </p>

        <p className="text-sm font-medium text-gray-900 mt-0.5 capitalize">
          {value}
        </p>
      </div>
    </div>
  );
}