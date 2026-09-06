"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  User,
  Phone,
  Mail,
  Briefcase,
} from "lucide-react";
import { useRouter } from "next/navigation";

type StaffRequest = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string | null;
  staff_number: string | null;
  tsc_number: string | null;
  requested_role: string;
  department: string | null;
  contract_type: string | null;
  created_at: string;
};

export default function StaffRequestsList({
  requests,
}: {
  requests: StaffRequest[];
}) {
  const router = useRouter();

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function approveRequest(id: string) {
    setLoadingId(id);

    try {
      const response = await fetch(
        `/api/staff-registration/${id}/approve`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error ?? "Unable to approve request.");
        return;
      }

      router.refresh();
    } catch {
      alert("Something went wrong.");
    } finally {
      setLoadingId(null);
    }
  }

  async function rejectRequest(id: string) {
    setLoadingId(id);

    try {
      const response = await fetch(
        `/api/staff-registration/${id}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error ?? "Unable to reject request.");
        return;
      }

      setRejectingId(null);
      setReason("");
      router.refresh();
    } catch {
      alert("Something went wrong.");
    } finally {
      setLoadingId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
        <User size={36} className="mx-auto text-gray-300 mb-3" />

        <h3 className="font-semibold text-gray-800">
          No Pending Requests
        </h3>

        <p className="text-sm text-gray-500 mt-1">
          Staff registration requests will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div
          key={request.id}
          className="bg-white border border-gray-200 rounded-xl p-5"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  {request.first_name} {request.last_name}
                </h3>

                <p className="text-sm text-gray-500 capitalize">
                  {request.requested_role?.replaceAll("_", " ")}
                  {request.department
                    ? ` · ${request.department}`
                    : ""}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail size={15} />
                  {request.email}
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={15} />
                  {request.phone}
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Briefcase size={15} />
                  TSC: {request.tsc_number || "-"}
                </div>

                <div className="text-gray-600">
                  Contract: {request.contract_type || "-"}
                </div>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => approveRequest(request.id)}
                disabled={loadingId === request.id}
                className="flex items-center gap-2 bg-eduke-green text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {loadingId === request.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}

                Approve
              </button>

              <button
                onClick={() => setRejectingId(request.id)}
                disabled={loadingId === request.id}
                className="flex items-center gap-2 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium"
              >
                <XCircle size={16} />
                Reject
              </button>
            </div>
          </div>

          {rejectingId === request.id && (
            <div className="mt-5 border-t pt-4">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for rejection (optional)"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                rows={3}
              />

              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => {
                    setRejectingId(null);
                    setReason("");
                  }}
                  className="px-3 py-2 text-sm text-gray-600"
                >
                  Cancel
                </button>

                <button
                  onClick={() => rejectRequest(request.id)}
                  disabled={loadingId === request.id}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}