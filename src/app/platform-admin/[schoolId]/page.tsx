import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ImpersonateButton from "@/components/ImpersonateButton";

export default async function PlatformAdminSchoolDetail({ params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  const admin = createAdminClient();

  const { data: school } = await admin.from("schools").select("*").eq("id", schoolId).maybeSingle();
  if (!school) notFound();

  const [{ count: studentCount }, { count: staffCount }, { count: classCount }, { data: staff }, { data: recentLogins }, { data: recentActivity }] =
    await Promise.all([
      admin.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "Active"),
      admin.from("staff").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "Active"),
      admin.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
      admin.from("staff").select("id, first_name, last_name, role, phone, status").eq("school_id", schoolId).order("first_name"),
      admin.from("login_sessions").select("user_name, user_role, logged_in_at").eq("school_id", schoolId).order("logged_in_at", { ascending: false }).limit(10),
      admin.from("audit_log").select("actor_name, actor_role, action, created_at").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(15),
    ]);

  const { data: currentTerm } = await admin
    .from("terms")
    .select("id, term_number, academic_year:academic_years(year)")
    .eq("is_current", true)
    .in("academic_year_id", (await admin.from("academic_years").select("id").eq("school_id", schoolId)).data?.map((y) => y.id) ?? [])
    .maybeSingle();

  let feeCollected = 0;
  if (currentTerm) {
    const { data: payments } = await admin
      .from("fee_payments")
      .select("amount, student:students!inner(school_id)")
      .eq("term_id", currentTerm.id)
      .eq("status", "Confirmed")
      .eq("student.school_id", schoolId);
    feeCollected = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  }

  return (
    <div className="space-y-6">
      <Link href="/platform-admin" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white w-fit">
        <ArrowLeft size={15} /> Back to all schools
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{school.name}</h1>
          <p className="text-sm text-gray-400">
            {school.county ?? "-"} · {school.school_type} · {school.curriculum ?? "-"} {school.is_boarding ? "· Boarding" : ""}
          </p>
        </div>
        <ImpersonateButton schoolId={school.id} schoolName={school.name} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400">Active Students</p>
          <p className="text-xl font-bold text-white mt-1">{studentCount ?? 0}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400">Active Staff</p>
          <p className="text-xl font-bold text-white mt-1">{staffCount ?? 0}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400">Classes</p>
          <p className="text-xl font-bold text-white mt-1">{classCount ?? 0}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400">Fees Collected {currentTerm ? `(${currentTerm.term_number})` : ""}</p>
          <p className="text-xl font-bold text-white mt-1">
            KES {feeCollected.toLocaleString("en-KE", { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-white mb-3">Staff</p>
          {!staff || staff.length === 0 ? (
            <p className="text-xs text-gray-400">No staff records yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {staff.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm border-b border-gray-700/50 pb-1.5 last:border-0">
                  <span className="text-gray-200">{s.first_name} {s.last_name}</span>
                  <span className="text-xs text-gray-400 capitalize">{s.role?.replace("_", " ") ?? "-"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-white mb-3">Recent Logins</p>
          {!recentLogins || recentLogins.length === 0 ? (
            <p className="text-xs text-gray-400">No login activity recorded yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {recentLogins.map((l, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b border-gray-700/50 pb-1.5 last:border-0">
                  <span className="text-gray-200">{l.user_name ?? "-"} <span className="text-xs text-gray-400 capitalize">({l.user_role?.replace("_", " ")})</span></span>
                  <span className="text-xs text-gray-400">
                    {new Date(l.logged_in_at).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-sm font-semibold text-white mb-3">Recent Activity</p>
        {!recentActivity || recentActivity.length === 0 ? (
          <p className="text-xs text-gray-400">No activity recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-gray-700/50 pb-1.5 last:border-0">
                <span className="text-gray-200">
                  {a.action} <span className="text-xs text-gray-400">by {a.actor_name ?? "-"} ({a.actor_role?.replace("_", " ") ?? "-"})</span>
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(a.created_at).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}