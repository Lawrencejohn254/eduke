"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, X, Loader2, Clock3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PendingLink = {
  linkId: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string | null;
  relationship: string | null;
  hasAccount: boolean;
  studentName: string;
  admissionNumber: string;
  className: string | null;
};

export default function PendingVerificationsTable({
  pendingVerifications,
}: {
  pendingVerifications: PendingLink[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(linkId: string) {
    setBusyId(linkId);
    setError(null);
    const { error } = await supabase.rpc("admin_verify_guardian_link", {
      p_student_guardian_id: linkId,
    });
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function handleUnlink(linkId: string) {
    setBusyId(linkId);
    setError(null);
    const { error } = await supabase.rpc("admin_unlink_guardian", {
      p_student_guardian_id: linkId,
    });
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  if (pendingVerifications.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
        <p className="font-medium text-gray-700">Nothing pending</p>
        <p className="text-sm text-gray-400 mt-1">
          Every guardian link at this school is verified.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      {error && (
        <div className="m-4 bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-left px-5 py-3">Guardian</th>
              <th className="text-left px-5 py-3">Relationship</th>
              <th className="text-left px-5 py-3">Student</th>
              <th className="text-right px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {pendingVerifications.map((link) => {
              const busy = busyId === link.linkId;
              return (
                <tr key={link.linkId} className="border-t border-gray-100">
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">{link.guardianName}</p>
                    <p className="text-xs text-gray-500 mt-1">{link.guardianPhone}</p>
                    {link.guardianEmail && (
                      <p className="text-xs text-gray-400">{link.guardianEmail}</p>
                    )}
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                      <Clock3 size={10} /> Pending
                    </span>
                  </td>
                  <td className="px-5 py-4">{link.relationship ?? "-"}</td>
                  <td className="px-5 py-4">
                    <p className="text-gray-900">{link.studentName}</p>
                    <p className="text-xs text-gray-400">
                      Adm No: {link.admissionNumber}
                      {link.className ? ` · ${link.className}` : ""}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        disabled={busy}
                        onClick={() => handleVerify(link.linkId)}
                        className="inline-flex items-center gap-1 bg-eduke-green text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                        Verify
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => handleUnlink(link.linkId)}
                        className="inline-flex items-center gap-1 border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                      >
                        <X size={14} /> Remove
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}