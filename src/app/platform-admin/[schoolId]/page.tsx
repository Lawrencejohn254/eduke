import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import FormDialogButton from "@/components/platform-admin/FormDialogButton";
import { suspendSchool, reactivateSchool, updateSchoolMetadata } from "../schools/actions";

export const dynamic = "force-dynamic";

interface SchoolDetail {
  id: string;
  name: string;
  school_type: string;
  school_level: string;
  county: string | null;
  sub_county: string | null;
  curriculum: string | null;
  phone: string | null;
  email: string | null;
  status: "active" | "suspended" | "pending_setup";
  created_at: string;
  suspended_at: string | null;
  suspension_reason: string | null;
  active_student_count: number;
  active_staff_count: number;
  active_parent_count: number;
  class_count: number;
  stream_count: number;
  subject_count: number;
  last_principal_login_at: string | null;
  last_staff_login_at: string | null;
  last_parent_login_at: string | null;
  last_attendance_at: string | null;
  last_exam_at: string | null;
  last_fee_payment_at: string | null;
  has_classes: boolean;
  has_subjects: boolean;
}

interface StaffRow {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string | null;
  status: string;
  email: string | null;
  phone: string | null;
  date_joined: string | null;
}

function fmtDate(v: string | null) {
  if (!v) return "Never";
  return new Date(v).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-xl p-5">
      <h2 className="text-base font-semibold text-white mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-white mt-0.5">{value}</p>
    </div>
  );
}

const STATUS_BADGE: Record<SchoolDetail["status"], string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  suspended: "bg-red-500/10 text-red-400 border-red-500/20",
  pending_setup: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const admin = await requirePlatformAdmin("view_schools");
  const { schoolId } = await params;
  const canManage = admin.has("manage_schools");

  const supabaseAdmin = createAdminClient();
  const [{ data: detailRows, error: detailError }, { data: staff, error: staffError }] = await Promise.all([
    supabaseAdmin.rpc("platform_school_detail", { target_school_id: schoolId }),
    supabaseAdmin.rpc("platform_school_staff_directory", { target_school_id: schoolId }),
  ]);

  if (detailError) console.error("Failed to load school detail:", detailError);
  if (staffError) console.error("Failed to load staff directory:", staffError);

  const school: SchoolDetail | null = (detailRows as SchoolDetail[] | null)?.[0] ?? null;
  const staffRows = (staff as StaffRow[] | null) ?? [];

  if (!school) {
    return (
      <div className="bg-gray-800 rounded-xl p-8 text-center text-sm text-gray-400">
        School not found.{" "}
        <Link href="/platform-admin/schools" className="text-eduke-gold hover:underline">
          Back to schools
        </Link>
      </div>
    );
  }

  const principal = staffRows.find((s) => s.role.toLowerCase().includes("principal") && !s.role.toLowerCase().includes("deputy"));
  const deputies = staffRows.filter((s) => s.role.toLowerCase().includes("deputy"));
  const otherStaff = staffRows.filter((s) => s !== principal && !deputies.includes(s));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{school.name}</h1>
            <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[school.status]}`}>
              {school.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {school.county ?? "No county"}
            {school.sub_county ? ` · ${school.sub_county}` : ""} · {school.school_type} · {school.curriculum ?? "-"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/platform-admin/schools" className="text-xs text-eduke-gold hover:underline">
            ← All schools
          </Link>
          {canManage && (
            <FormDialogButton
              triggerLabel="Edit"
              title={`Edit ${school.name}`}
              action={updateSchoolMetadata}
              hiddenFields={{ schoolId: school.id }}
              confirmLabel="Save changes"
              fields={[
                { name: "name", label: "School name", defaultValue: school.name, required: true },
                { name: "county", label: "County", defaultValue: school.county ?? "" },
                { name: "sub_county", label: "Sub-county", defaultValue: school.sub_county ?? "" },
                { name: "phone", label: "Phone", defaultValue: school.phone ?? "" },
                { name: "email", label: "Email", defaultValue: school.email ?? "", type: "email" },
              ]}
            />
          )}
          {canManage && school.status !== "suspended" && (
            <FormDialogButton
              triggerLabel="Suspend"
              triggerClassName="text-xs font-medium text-red-400 hover:underline"
              title={`Suspend ${school.name}?`}
              description="Blocks access without deleting data."
              variant="danger"
              action={suspendSchool}
              hiddenFields={{ schoolId: school.id }}
              confirmLabel="Suspend school"
              fields={[{ name: "reason", label: "Reason", type: "textarea", required: true }]}
            />
          )}
          {canManage && school.status === "suspended" && (
            <FormDialogButton
              triggerLabel="Reactivate"
              triggerClassName="text-xs font-medium text-green-400 hover:underline"
              title={`Reactivate ${school.name}?`}
              action={reactivateSchool}
              hiddenFields={{ schoolId: school.id }}
              confirmLabel="Reactivate"
            />
          )}
        </div>
      </div>

      {school.status === "suspended" && school.suspension_reason && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
          Suspended{school.suspended_at ? ` on ${fmtDate(school.suspended_at)}` : ""}: {school.suspension_reason}
        </div>
      )}

      {/* School information */}
      <Section title="School Information">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="School type" value={school.school_type} />
          <Stat label="Level" value={school.school_level} />
          <Stat label="Curriculum" value={school.curriculum ?? "-"} />
          <Stat label="Registered" value={fmtDate(school.created_at)} />
          <Stat label="Phone" value={school.phone ?? "-"} />
          <Stat label="Email" value={school.email ?? "-"} />
          <Stat label="County" value={school.county ?? "-"} />
          <Stat label="Sub-county" value={school.sub_county ?? "-"} />
        </div>
      </Section>

      {/* Usage */}
      <Section title="Usage">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Active Students" value={school.active_student_count} />
          <Stat label="Active Staff" value={school.active_staff_count} />
          <Stat label="Active Parents" value={school.active_parent_count} />
          <Stat label="Classes" value={school.class_count} />
          <Stat label="Streams" value={school.stream_count} />
          <Stat label="Subjects" value={school.subject_count} />
        </div>
      </Section>

      {/* Activity */}
      <Section title="Activity">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Stat label="Last principal login" value={fmtDate(school.last_principal_login_at)} />
          <Stat label="Last staff login" value={fmtDate(school.last_staff_login_at)} />
          <Stat label="Last parent activity" value={fmtDate(school.last_parent_login_at)} />
          <Stat label="Last attendance recorded" value={fmtDate(school.last_attendance_at)} />
          <Stat label="Last exam" value={fmtDate(school.last_exam_at)} />
          <Stat label="Last fee payment" value={fmtDate(school.last_fee_payment_at)} />
        </div>
      </Section>

      {/* School Health */}
      <Section title="School Health">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`px-2 py-1 rounded-full border ${school.status === "active" ? "border-green-500/20 bg-green-500/10 text-green-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`}>
            {school.status === "active" ? "Active" : school.status.replace("_", " ")}
          </span>
          <span className={`px-2 py-1 rounded-full border ${school.has_classes ? "border-green-500/20 bg-green-500/10 text-green-400" : "border-blue-500/20 bg-blue-500/10 text-blue-400"}`}>
            {school.has_classes ? "Classes set up" : "No classes yet"}
          </span>
          <span className={`px-2 py-1 rounded-full border ${school.has_subjects ? "border-green-500/20 bg-green-500/10 text-green-400" : "border-blue-500/20 bg-blue-500/10 text-blue-400"}`}>
            {school.has_subjects ? "Subjects set up" : "No subjects yet"}
          </span>
          <span className={`px-2 py-1 rounded-full border ${school.active_staff_count > 0 ? "border-green-500/20 bg-green-500/10 text-green-400" : "border-orange-500/20 bg-orange-500/10 text-orange-400"}`}>
            {school.active_staff_count > 0 ? "Has active staff" : "No active staff"}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Full trend view: <Link href="/platform-admin/health" className="text-eduke-gold hover:underline">School Health →</Link>
        </p>
      </Section>

      {/* People */}
      <Section title="People">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Principal</p>
            <p className="text-sm text-white">
              {principal ? `${principal.first_name} ${principal.last_name}` : "Not on record"}
              {principal?.email && <span className="text-gray-500"> · {principal.email}</span>}
            </p>
          </div>

          {deputies.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Deputy Principal(s)</p>
              {deputies.map((d) => (
                <p key={d.id} className="text-sm text-white">
                  {d.first_name} {d.last_name}
                </p>
              ))}
            </div>
          )}

          <div>
            <p className="text-xs text-gray-400 mb-2">
              Other Staff ({otherStaff.length})
            </p>
            <div className="max-h-64 overflow-y-auto border border-gray-700 rounded-lg divide-y divide-gray-700/50">
              {otherStaff.length === 0 ? (
                <p className="p-3 text-xs text-gray-500">No other staff on record.</p>
              ) : (
                otherStaff.map((s) => (
                  <div key={s.id} className="px-3 py-2 flex items-center justify-between text-xs">
                    <span className="text-white">
                      {s.first_name} {s.last_name}
                      <span className="text-gray-500"> — {s.role}{s.department ? ` · ${s.department}` : ""}</span>
                    </span>
                    <span className={s.status === "Active" ? "text-green-400" : "text-gray-500"}>{s.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Students, parents, and full user records:{" "}
            <Link href={`/platform-admin/users?school=${school.id}`} className="text-eduke-gold hover:underline">
              view in Users →
            </Link>
          </p>
        </div>
      </Section>
    </div>
  );
}