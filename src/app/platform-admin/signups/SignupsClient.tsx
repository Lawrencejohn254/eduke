"use client";

import { useState } from "react";

type SignupRequest = {
  id: string;
  auth_user_id: string | null;
  school_name: string;
  county: string | null;
  sub_county: string | null;
  school_phone: string | null;
  school_email: string | null;
  school_type: string | null;
  school_level: string | null;
  curriculum: string | null;
  is_boarding: boolean;
  principal_first_name: string;
  principal_last_name: string;
  principal_email: string;
  principal_phone: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
};

export default function SignupsClient({
  requests,
}: {
  requests: SignupRequest[];
}) {
  const [selectedRequest, setSelectedRequest] =
    useState<SignupRequest | null>(null);

  if (!requests.length) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
        <p className="text-gray-300 font-medium">
          No school signup requests found.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          New school registrations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div
          key={request.id}
          className="rounded-xl border border-gray-800 bg-gray-900 p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {request.school_name}
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                Principal:{" "}
                <span className="text-gray-200">
                  {request.principal_first_name}{" "}
                  {request.principal_last_name}
                </span>
              </p>

              <p className="text-sm text-gray-400">
                Email:{" "}
                <span className="text-gray-200">
                  {request.principal_email}
                </span>
              </p>

              {request.principal_phone && (
                <p className="text-sm text-gray-400">
                  Phone:{" "}
                  <span className="text-gray-200">
                    {request.principal_phone}
                  </span>
                </p>
              )}
            </div>

            <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-400">
              {request.status}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-800 pt-5">
            <div>
              <p className="text-xs text-gray-500">County</p>
              <p className="mt-1 text-sm text-gray-200">
                {request.county || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Sub-county</p>
              <p className="mt-1 text-sm text-gray-200">
                {request.sub_county || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">School Type</p>
              <p className="mt-1 text-sm text-gray-200">
                {request.school_type || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Level</p>
              <p className="mt-1 text-sm text-gray-200">
                {request.school_level || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Curriculum</p>
              <p className="mt-1 text-sm text-gray-200">
                {request.curriculum || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Boarding</p>
              <p className="mt-1 text-sm text-gray-200">
                {request.is_boarding ? "Yes" : "No"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">School Email</p>
              <p className="mt-1 text-sm text-gray-200 break-all">
                {request.school_email || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Submitted</p>
              <p className="mt-1 text-sm text-gray-200">
                {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setSelectedRequest(request)}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors"
            >
              Review
            </button>
          </div>
        </div>
      ))}

      {selectedRequest && (
        <ReviewModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}

function ReviewModal({
  request,
  onClose,
}: {
  request: SignupRequest;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  async function handleAction(action: "approve" | "reject") {
    if (
      action === "reject" &&
      !rejectionReason.trim()
    ) {
      alert("Please provide a rejection reason.");
      return;
    }

    setLoading(action);

    try {
      const response = await fetch("/api/platform-admin/signup-review", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    requestId: request.id,
    action,
    rejectionReason:
      action === "reject"
        ? rejectionReason
        : null,
  }),
});

const responseText = await response.text();

console.log("STATUS:", response.status);
console.log("CONTENT TYPE:", response.headers.get("content-type"));
console.log("RESPONSE:", responseText);

let data;

try {
  data = JSON.parse(responseText);
} catch {
  throw new Error(
    `Server returned ${response.status} instead of JSON: ${responseText.slice(
      0,
      500
    )}`
  );
}

if (!response.ok) {
  throw new Error(data.error || "Something went wrong.");
}

window.location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-xl bg-gray-900 border border-gray-800 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Review School
          </h2>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <p className="text-xs text-gray-500">School</p>
            <p className="text-white font-medium">
              {request.school_name}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Principal</p>
            <p className="text-gray-200">
              {request.principal_first_name}{" "}
              {request.principal_last_name}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-gray-200">
              {request.principal_email}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Location</p>
            <p className="text-gray-200">
              {request.county || "—"} /{" "}
              {request.sub_county || "—"}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm text-gray-400">
            Rejection reason
          </label>

          <textarea
            value={rejectionReason}
            onChange={(e) =>
              setRejectionReason(e.target.value)
            }
            placeholder="Only required when rejecting..."
            className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-gray-500"
            rows={3}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading !== null}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </button>

          <button
            onClick={() => handleAction("reject")}
            disabled={loading !== null}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
          >
            {loading === "reject"
              ? "Rejecting..."
              : "Reject"}
          </button>

          <button
            onClick={() => handleAction("approve")}
            disabled={loading !== null}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
          >
            {loading === "approve"
              ? "Approving..."
              : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}