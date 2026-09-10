import { getProfileOrRedirect } from "@/lib/get-profile";
import { getChildrenForGuardian } from "@/lib/get-children";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/Loaders";
import ChildSelector from "@/components/ChildSelector";
import StatCard from "@/components/StatCard";
import { formatKES } from "@/lib/format";
import { Wallet, Award, CalendarCheck, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function ParentHomePage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const profile = await getProfileOrRedirect();
  const children = await getChildrenForGuardian(profile.guardian_id);
  const params = await searchParams;

  if (children.length === 0) {
    return (
      <EmptyState
        title="No children linked yet"
        description="Contact the school office to link your account to your child's record."
      />
    );
  }

  const activeChild = children.find((c) => c.id === params.child) ?? children[0];
  const supabase = await createClient();

  const { data: currentTerm } = await supabase
    .from("terms")
    .select("id, term_number")
    .eq("is_current", true)
    .maybeSingle();

  let balance = 0;
  if (currentTerm && activeChild.class_id) {
    const { data: structure } = await supabase.from("fee_structure").select("amount").eq("term_id", currentTerm.id).eq("class_id", activeChild.class_id);
    const expected = (structure ?? []).reduce((s, f) => s + Number(f.amount), 0);
    const { data: payments } = await supabase.from("fee_payments").select("amount").eq("student_id", activeChild.id).eq("term_id", currentTerm.id).eq("status", "Confirmed");
    const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
    balance = Math.max(expected - paid, 0);
  }

  const { data: lastResult } = await supabase
    .from("exam_results")
    .select("marks_obtained, grade, subject:subjects(name), exam:exams(name)")
    .eq("student_id", activeChild.id)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: attendanceRows } = await supabase
    .from("attendance")
    .select("status")
    .eq("student_id", activeChild.id)
    .gte("date", thirtyDaysAgo.toISOString().slice(0, 10));

  const present = (attendanceRows ?? []).filter((a) => a.status === "Present").length;
  const rate = attendanceRows && attendanceRows.length ? Math.round((present / attendanceRows.length) * 100) : null;

  const initial = activeChild.first_name?.[0]?.toUpperCase() ?? "?";

  const quickLinks = [
    {
      href: "/parent/fees",
      label: "Fees",
      sublabel: "Balance & payment history",
      icon: Wallet,
    },
    {
      href: "/parent/results",
      label: "Results",
      sublabel: "Exam scores & report cards",
      icon: Award,
    },
    {
      href: "/parent/attendance",
      label: "Attendance",
      sublabel: "Daily attendance record",
      icon: CalendarCheck,
    },
    {
      href: "/parent/timetable",
      label: "Timetable",
      sublabel: "Weekly class schedule",
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6">
      {/* =====================================================
          WELCOME HEADER
      ====================================================== */}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-eduke-green text-white flex items-center justify-center text-lg font-bold shrink-0">
              {initial}
            </div>

            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900">
                Karibu, {profile.first_name}
              </h1>
              <p className="text-sm text-gray-500 truncate">
                {activeChild.first_name} {activeChild.last_name} · {activeChild.className}{" "}
                {activeChild.streamName}
                {activeChild.admission_number
                  ? ` · Adm No: ${activeChild.admission_number}`
                  : ""}
              </p>
            </div>
          </div>

          {children.length > 1 && (
            <ChildSelector
              children={children.map((c) => ({
                id: c.id,
                first_name: c.first_name,
                last_name: c.last_name,
                className: c.className,
              }))}
            />
          )}
        </div>
      </div>

      {/* =====================================================
          STATS OVERVIEW
      ====================================================== */}

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
          Overview
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/parent/fees">
            <StatCard
              label="Fee Balance"
              value={formatKES(balance)}
              icon={Wallet}
              tone={balance > 0 ? "danger" : "default"}
            />
          </Link>
          <Link href="/parent/results">
            <StatCard
              label="Latest Result"
              value={
                lastResult
                  ? `${(lastResult.subject as unknown as { name: string })?.name}: ${lastResult.grade}`
                  : "No results yet"
              }
              icon={Award}
            />
          </Link>
          <Link href="/parent/attendance">
            <StatCard
              label="Attendance (30 days)"
              value={rate !== null ? `${rate}%` : "No data"}
              icon={CalendarCheck}
              tone={rate !== null && rate < 80 ? "danger" : "default"}
            />
          </Link>
        </div>
      </div>

      {/* =====================================================
          QUICK LINKS
      ====================================================== */}

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
          Explore
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-eduke-green transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-eduke-green/10 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-eduke-green" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{link.label}</p>
                  <p className="text-xs text-gray-500 truncate">{link.sublabel}</p>
                </div>

                <ChevronRight size={16} className="text-gray-400 shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}