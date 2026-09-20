import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { FileBarChart } from "lucide-react";
import SupportReportsClient from "./SupportReportsClient";

export default async function SupportReportsPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: staffRecord } = await supabase
    .from("staff")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("school_id", profile.school_id)
    .eq("status", "Active")
    .maybeSingle();

  const [{ data: attendance }, { data: tasks }] = await Promise.all([
    staffRecord
      ? supabase
          .from("staff_attendance")
          .select("attendance_date, sign_in_at, sign_out_at, status, minutes_late")
          .eq("staff_id", staffRecord.id)
          .order("attendance_date", { ascending: false })
          .limit(90)
      : Promise.resolve({ data: [] }),
    staffRecord
      ? supabase.from("staff_tasks").select("title, priority, status, due_date, completed_at").eq("assigned_to", staffRecord.id)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileBarChart size={20} /> My Reports
        </h1>
        <p className="text-sm text-gray-500">Your attendance and task history, exportable as CSV.</p>
      </div>

      <SupportReportsClient attendance={attendance ?? []} tasks={tasks ?? []} />
    </div>
  );
}