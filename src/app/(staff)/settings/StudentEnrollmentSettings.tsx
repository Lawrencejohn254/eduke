"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function StudentEnrollmentSettings({
  schoolId,
  initialEnabled,
  canManage,
}: {
  schoolId: string;
  initialEnabled: boolean;
  canManage: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function toggle() {
    if (!canManage || saving) return;
    setSaving(true);
    setError(null);
    const next = !enabled;
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("schools")
      .update({ student_enrollment_enabled: next })
      .eq("id", schoolId);

    setSaving(false);

    if (updateError) {
      // RLS ("schools staff update") is the real gate — this message just
      // covers the case where something other than principal/deputy_principal/
      // super_admin somehow reaches this button.
      setError(
        updateError.code === "42501"
          ? "You don't have permission to change this setting."
          : updateError.message
      );
      return;
    }

    setEnabled(next);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-700">Student Enrollment</p>
          <p className="text-xs text-gray-500 mt-1">Allow teachers to enroll students</p>
        </div>

        <span
          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
            enabled ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-green-500" : "bg-gray-400"}`} />
          {enabled ? "Enrollment Active" : "Enrollment Closed"}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {enabled
          ? "Teachers can access Wanafunzi and register new students."
          : "Teachers no longer have access to student enrollment."}
      </p>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {canManage ? (
        <button
          onClick={toggle}
          disabled={saving}
          className={`flex items-center justify-center gap-2 text-sm font-medium rounded-lg px-4 py-2.5 disabled:opacity-50 ${
            enabled
              ? "bg-red-50 text-red-700 hover:bg-red-100"
              : "bg-eduke-green text-white hover:bg-eduke-green-dark"
          }`}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {enabled ? "Deactivate Enrollment" : "Activate Enrollment"}
        </button>
      ) : (
        <p className="text-xs text-gray-400">
          Only the principal or an administrator can change this setting.
        </p>
      )}
    </div>
  );
}