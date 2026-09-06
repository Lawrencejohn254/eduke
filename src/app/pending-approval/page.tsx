import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  GraduationCap,
  Clock,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import SignOutButton from "@/components/SignOutButton";

export default async function PendingApprovalPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ==========================================
  // 1. CHECK SCHOOL / PRINCIPAL REGISTRATION
  // ==========================================

  const { data: schoolRequest } = await supabase
    .from("school_signup_requests")
    .select(
      "school_name, status, rejection_reason, created_at"
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // ==========================================
  // 2. CHECK STAFF REGISTRATION
  // ==========================================

  const { data: staffRequest } = await supabase
    .from("staff_registration_requests")
    .select(
      "first_name, last_name, requested_role, status, rejection_reason, created_at"
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // ==========================================
  // NO PENDING REQUEST FOUND
  // ==========================================

  if (!schoolRequest && !staffRequest) {
    redirect("/login");
  }

  // ==========================================
  // STAFF REGISTRATION VIEW
  // ==========================================

  if (staffRequest) {
    const isRejected = staffRequest.status === "rejected";
    const isApproved = staffRequest.status === "approved";

    return (
      <div className="min-h-screen flex items-center justify-center bg-eduke-bg px-4">
        <div className="w-full max-w-md">
          {/* LOGO */}
          <div className="flex flex-col items-center mb-6">
            <div className="bg-eduke-green rounded-2xl p-3 mb-3">
              <GraduationCap
                size={32}
                className="text-eduke-gold"
              />
            </div>

            <h1 className="text-xl font-bold text-eduke-green">
              EduKe
            </h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center space-y-4">

            {isRejected ? (
              <>
                <XCircle
                  size={44}
                  className="mx-auto text-red-500"
                />

                <h2 className="font-semibold text-gray-900">
                  Registration Not Approved
                </h2>

                <p className="text-sm text-gray-500">
                  Your registration request was not approved by
                  the school administrator.
                </p>

                {staffRequest.rejection_reason && (
                  <div className="text-sm text-gray-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-left">
                    <strong>Reason:</strong>{" "}
                    {staffRequest.rejection_reason}
                  </div>
                )}

                <SignOutButton />
              </>
            ) : isApproved ? (
              <>
                <CheckCircle2
                  size={44}
                  className="mx-auto text-green-500"
                />

                <h2 className="font-semibold text-gray-900">
                  Account Approved
                </h2>

                <p className="text-sm text-gray-500">
                  Your account has been approved. You can now
                  access your EduKe dashboard.
                </p>

                <a
                  href="/login"
                  className="inline-flex justify-center bg-eduke-green text-white rounded-lg px-5 py-2.5 text-sm font-medium"
                >
                  Continue to Login
                </a>
              </>
            ) : (
              <>
                <Clock
                  size={44}
                  className="mx-auto text-eduke-gold"
                />

                <h2 className="font-semibold text-gray-900">
                  Waiting for Approval
                </h2>

                <p className="text-sm text-gray-500">
                  Hi <strong>{staffRequest.first_name}</strong>,
                  your registration request has been submitted
                  successfully.
                </p>

                <p className="text-sm text-gray-500">
                  Your school principal will review and approve
                  your account before you can access EduKe.
                </p>

                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                  Requested Role:{" "}
                  <strong className="capitalize">
                    {staffRequest.requested_role.replaceAll("_", " ")}
                  </strong>
                </div>

                <SignOutButton />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SCHOOL / PRINCIPAL REGISTRATION VIEW
  // ==========================================

  if (schoolRequest) {
    const isRejected =
      schoolRequest.status === "rejected";

    return (
      <div className="min-h-screen flex items-center justify-center bg-eduke-bg px-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-eduke-green rounded-2xl p-3 mb-3">
              <GraduationCap
                size={32}
                className="text-eduke-gold"
              />
            </div>

            <h1 className="text-xl font-bold text-eduke-green">
              EduKe
            </h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center space-y-3">

            {isRejected ? (
              <>
                <XCircle
                  size={40}
                  className="mx-auto text-red-500"
                />

                <p className="font-semibold text-gray-900">
                  Registration Not Approved
                </p>

                <p className="text-sm text-gray-500">
                  Your request to register{" "}
                  <strong>
                    {schoolRequest.school_name}
                  </strong>{" "}
                  was not approved.
                </p>

                {schoolRequest.rejection_reason && (
                  <p className="text-sm text-gray-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-left">
                    <strong>Reason:</strong>{" "}
                    {schoolRequest.rejection_reason}
                  </p>
                )}

                <SignOutButton />
              </>
            ) : (
              <>
                <Clock
                  size={40}
                  className="mx-auto text-eduke-gold"
                />

                <p className="font-semibold text-gray-900">
                  Registration Under Review
                </p>

                <p className="text-sm text-gray-500">
                  Thanks for registering{" "}
                  <strong>
                    {schoolRequest.school_name}
                  </strong>
                  . A platform administrator is reviewing your
                  request.
                </p>

                <SignOutButton />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  redirect("/login");
}