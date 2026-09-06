import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { UserPlus, Clock } from "lucide-react";
import { formatDateDMY } from "@/lib/format";

export default async function StaffRequestsPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  // Only authorized roles should manage staff requests
  const authorizedRoles = [
    "principal",
    "deputy_principal",
    "super_admin",
    "admin",
    "hr",
  ];

  if (!authorizedRoles.includes(profile.role)) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">
          Access Denied
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          You do not have permission to view staff registration requests.
        </p>
      </div>
    );
  }

  const { data: requests, error } = await supabase
    .from("staff_registration_requests")
    .select("*")
    .eq("school_id", profile.school_id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <div className="flex items-center gap-2">
          <UserPlus className="text-eduke-green" size={24} />
          <h1 className="text-2xl font-bold text-gray-900">
            Staff Registration Requests
          </h1>
        </div>

        <p className="text-sm text-gray-500 mt-1">
          Review and approve staff members requesting access to your school.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Failed to load requests: {error.message}
        </div>
      )}

      {!error && (!requests || requests.length === 0) && (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
          <Clock
            size={40}
            className="mx-auto text-gray-300 mb-3"
          />

          <h2 className="font-semibold text-gray-900">
            No Pending Requests
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            New staff registration requests will appear here.
          </p>
        </div>
      )}

      {requests && requests.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">
                    Staff Member
                  </th>

                  <th className="text-left px-5 py-3 font-medium text-gray-500">
                    Role
                  </th>

                  <th className="text-left px-5 py-3 font-medium text-gray-500">
                    Department
                  </th>

                  <th className="text-left px-5 py-3 font-medium text-gray-500">
                    Contact
                  </th>

                  <th className="text-left px-5 py-3 font-medium text-gray-500">
                    Requested
                  </th>

                  <th className="text-right px-5 py-3 font-medium text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {request.first_name} {request.last_name}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {request.email}
                      </p>
                    </td>

                    <td className="px-5 py-4 capitalize">
                      {request.requested_role?.replaceAll("_", " ")}
                    </td>

                    <td className="px-5 py-4">
                      {request.department ?? "-"}
                    </td>

                    <td className="px-5 py-4">
                      <p>{request.phone ?? "-"}</p>

                      {request.tsc_number && (
                        <p className="text-xs text-gray-500">
                          TSC: {request.tsc_number}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-gray-500">
                      {request.created_at
                        ? formatDateDMY(request.created_at)
                        : "-"}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button className="text-eduke-green font-medium hover:underline">
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}