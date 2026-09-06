"use client";

import { useState } from "react";
import {
  Check,
  X,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Request = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string | null;
  tsc_number: string | null;
  requested_role: string;
  department: string | null;
  contract_type: string | null;
  status: string;
  created_at: string;
};

export default function AccountRequestsTable({
  initialRequests,
}: {
  initialRequests: Request[];
}) {
  const router = useRouter();

  const [loadingId, setLoadingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  async function handleAction(
    id: string,
    action: "approve" | "reject"
  ) {
    setLoadingId(id);
    setError(null);

    try {
      const response = await fetch(
        `/api/staff/account-requests/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ??
          "Unable to process request."
        );
        return;
      }

      router.refresh();

    } catch {
      setError(
        "Something went wrong."
      );
    } finally {
      setLoadingId(null);
    }
  }

  if (initialRequests.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
        <p className="font-medium text-gray-700">
          No pending account requests
        </p>

        <p className="text-sm text-gray-400 mt-1">
          New staff registration requests will appear here.
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
              <th className="text-left px-5 py-3">
                Staff Member
              </th>

              <th className="text-left px-5 py-3">
                Requested Role
              </th>

              <th className="text-left px-5 py-3">
                Department
              </th>

              <th className="text-left px-5 py-3">
                Applied
              </th>

              <th className="text-right px-5 py-3">
                Action
              </th>
            </tr>
          </thead>

          <tbody>

            {initialRequests.map((request) => {

              const loading =
                loadingId === request.id;

              return (
                <tr
                  key={request.id}
                  className="border-t border-gray-100"
                >

                  <td className="px-5 py-4">

                    <p className="font-medium text-gray-900">
                      {request.first_name}{" "}
                      {request.last_name}
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      {request.email}
                    </p>

                    <p className="text-xs text-gray-400">
                      {request.phone}
                    </p>

                  </td>

                  <td className="px-5 py-4 capitalize">
                    {request.requested_role.replaceAll(
                      "_",
                      " "
                    )}
                  </td>

                  <td className="px-5 py-4">
                    {request.department ?? "-"}
                  </td>

                  <td className="px-5 py-4 text-gray-500">
                    {new Date(
                      request.created_at
                    ).toLocaleDateString()}
                  </td>

                  <td className="px-5 py-4">

                    <div className="flex justify-end gap-2">

                      <button
                        disabled={loading}
                        onClick={() =>
                          handleAction(
                            request.id,
                            "approve"
                          )
                        }
                        className="inline-flex items-center gap-1 bg-eduke-green text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                      >

                        {loading ? (
                          <Loader2
                            size={14}
                            className="animate-spin"
                          />
                        ) : (
                          <Check size={14} />
                        )}

                        Approve

                      </button>

                      <button
                        disabled={loading}
                        onClick={() =>
                          handleAction(
                            request.id,
                            "reject"
                          )
                        }
                        className="inline-flex items-center gap-1 border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                      >
                        <X size={14} />

                        Reject
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