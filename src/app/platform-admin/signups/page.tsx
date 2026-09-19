import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import FormDialogButton from "@/components/platform-admin/FormDialogButton";
import {
  moveToUnderReview,
  approveSignup,
  rejectSignup,
  holdSignup,
  requestMoreInfo,
} from "./actions";

export const dynamic = "force-dynamic";

interface SignupRow {
  id: string;
  school_name: string;
  county: string | null;
  sub_county: string | null;
  principal_first_name: string | null;
  principal_last_name: string | null;
  principal_email: string | null;
  created_at: string;
  status: "pending" | "under_review" | "approved" | "rejected" | "on_hold";
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
}

const TABS: { key: SignupRow["status"] | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "under_review", label: "Under Review" },
  { key: "on_hold", label: "On Hold" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const STATUS_BADGE: Record<SignupRow["status"], string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  under_review: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  on_hold: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  approved: "bg-green-500/10 text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default async function SignupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const admin = await requirePlatformAdmin("approve_signups");
  const params = await searchParams;
  const activeTab = (params.status as SignupRow["status"] | "all") || "pending";

  const supabaseAdmin = createAdminClient();
  let query = supabaseAdmin
    .from("school_signup_requests")
    .select(
      "id, school_name, county, sub_county, principal_first_name, principal_last_name, principal_email, created_at, status, reviewed_by_email, reviewed_at, rejection_reason, admin_notes"
    )
    .order("created_at", { ascending: false });

  if (activeTab !== "all") query = query.eq("status", activeTab);

  const { data, error } = await query;
  if (error) console.error("Failed to load signup requests:", error);
  const rows = (data as SignupRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">School Signup Requests</h1>
          <p className="text-sm text-gray-400">Review, approve, reject, or hold new school applications.</p>
        </div>
        <Link href="/platform-admin" className="text-xs text-eduke-gold hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "pending" ? "/platform-admin/signups" : `?status=${tab.key}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              activeTab === tab.key
                ? "bg-eduke-gold text-gray-900 border-eduke-gold"
                : "text-gray-300 border-gray-700 hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No requests in this state.
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {rows.map((r) => (
              <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-white">{r.school_name}</p>
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[r.status]}`}
                    >
                      {r.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Principal:{" "}
                    <span className="text-gray-300">
                      {r.principal_first_name} {r.principal_last_name}
                    </span>{" "}
                    · {r.principal_email}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {r.county || "No county"}
                    {r.sub_county ? ` · ${r.sub_county}` : ""} · Registered{" "}
                    {new Date(r.created_at).toLocaleDateString("en-KE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  {r.reviewed_by_email && (
                    <p className="text-xs text-gray-500 mt-1">
                      Reviewed by {r.reviewed_by_email}
                      {r.reviewed_at &&
                        ` on ${new Date(r.reviewed_at).toLocaleDateString("en-KE", {
                          day: "2-digit",
                          month: "short",
                        })}`}
                    </p>
                  )}
                  {r.rejection_reason && (
                    <p className="text-xs text-red-400 mt-1">Reason: {r.rejection_reason}</p>
                  )}
                  {r.admin_notes && (
                    <p className="text-xs text-gray-400 mt-1">Notes: {r.admin_notes}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 items-end shrink-0">
                  {(r.status === "pending" || r.status === "on_hold") && (
                    <form action={moveToUnderReview}>
                      <input type="hidden" name="signupId" value={r.id} />
                      <button className="text-xs font-medium text-blue-400 hover:underline">
                        Start review
                      </button>
                    </form>
                  )}

                  {(r.status === "pending" || r.status === "under_review" || r.status === "on_hold") && (
                    <>
                      <FormDialogButton
                        triggerLabel="Approve"
                        triggerClassName="text-xs font-medium text-green-400 hover:underline"
                        title={`Approve ${r.school_name}?`}
                        description="This records approval. You'll still need to run the school onboarding step to provision the school."
                        action={approveSignup}
                        hiddenFields={{ signupId: r.id }}
                        confirmLabel="Approve"
                      />
                      <FormDialogButton
                        triggerLabel="Reject"
                        triggerClassName="text-xs font-medium text-red-400 hover:underline"
                        title={`Reject ${r.school_name}?`}
                        variant="danger"
                        action={rejectSignup}
                        hiddenFields={{ signupId: r.id }}
                        confirmLabel="Reject"
                        fields={[
                          {
                            name: "reason",
                            label: "Reason (required, shown to the applicant)",
                            type: "textarea",
                            required: true,
                          },
                        ]}
                      />
                      <FormDialogButton
                        triggerLabel="Put on hold"
                        triggerClassName="text-xs font-medium text-orange-400 hover:underline"
                        title={`Put ${r.school_name} on hold?`}
                        action={holdSignup}
                        hiddenFields={{ signupId: r.id }}
                        confirmLabel="Put on hold"
                        fields={[
                          { name: "admin_notes", label: "Notes (optional)", type: "textarea" },
                        ]}
                      />
                      <FormDialogButton
                        triggerLabel="Request more info"
                        triggerClassName="text-xs font-medium text-gray-300 hover:underline"
                        title={`Request more information from ${r.school_name}`}
                        action={requestMoreInfo}
                        hiddenFields={{ signupId: r.id }}
                        confirmLabel="Send request"
                        fields={[
                          {
                            name: "admin_notes",
                            label: "What's needed?",
                            type: "textarea",
                            required: true,
                          },
                        ]}
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}