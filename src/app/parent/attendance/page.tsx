import { getProfileOrRedirect } from "@/lib/get-profile";
import { getChildrenForGuardian } from "@/lib/get-children";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/Loaders";
import ChildSelector from "@/components/ChildSelector";
import StatusBadge from "@/components/StatusBadge";
import { formatDateDMY } from "@/lib/format";

export default async function ParentAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const profile = await getProfileOrRedirect();
  const children = await getChildrenForGuardian(profile.guardian_id);
  const params = await searchParams;

  if (children.length === 0) {
    return <EmptyState title="No children linked yet" description="Contact the school office to link your account to your child's record." />;
  }

  const activeChild = children.find((c) => c.id === params.child) ?? children[0];
  const supabase = await createClient();

  const { data: attendance } = await supabase
    .from("attendance")
    .select("date, status, notes")
    .eq("student_id", activeChild.id)
    .order("date", { ascending: false })
    .limit(60);

  const present = (attendance ?? []).filter((a) => a.status === "Present").length;
  const rate = attendance && attendance.length ? Math.round((present / attendance.length) * 100) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Attendance (Mahudhurio)</h1>
          <p className="text-sm text-gray-500">
            {activeChild.first_name} {activeChild.last_name} {rate !== null && `· ${rate}% attendance rate`}
          </p>
        </div>
        <ChildSelector children={children.map((c) => ({ id: c.id, first_name: c.first_name, last_name: c.last_name, className: c.className }))} />
      </div>

      {!attendance || attendance.length === 0 ? (
        <EmptyState title="No attendance records yet" description="Daily attendance will appear here once recorded by the class teacher." />
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((a, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="p-3 text-gray-700">{formatDateDMY(a.date)}</td>
                  <td className="p-3"><StatusBadge status={a.status} /></td>
                  <td className="p-3 text-gray-500">{a.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
