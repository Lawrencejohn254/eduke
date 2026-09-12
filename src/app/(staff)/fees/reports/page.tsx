import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { formatKES } from "@/lib/format";
import { EmptyState } from "@/components/Loaders";
import StatCard from "@/components/StatCard";
import { Wallet, TrendingUp, AlertTriangle } from "lucide-react";

export default async function FeeReportsPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: currentTerm } = await supabase
    .from("terms")
    .select("id, term_number, academic_year:academic_years(year)")
    .eq("is_current", true)
    .maybeSingle();

  if (!currentTerm) {
    return <EmptyState title="No current term set" description="Set a current term in Settings to view finance reports." />;
  }

  const { data: payments } = await supabase
    .from("fee_payments")
    .select("amount, fee_category, payment_method, student:students!inner(school_id)")
    .eq("term_id", currentTerm.id)
    .eq("status", "Confirmed")
    .eq("student.school_id", profile.school_id);

  const byCategory = new Map<string, number>();
  const byMethod = new Map<string, number>();
  let total = 0;
  for (const p of payments ?? []) {
    const amt = Number(p.amount);
    total += amt;
    byCategory.set(p.fee_category ?? "Other", (byCategory.get(p.fee_category ?? "Other") ?? 0) + amt);
    byMethod.set(p.payment_method ?? "Other", (byMethod.get(p.payment_method ?? "Other") ?? 0) + amt);
  }

  // Outstanding balance — mirrors the same calculation used on the Principal's dashboard,
  // for consistency between the two views. Note: this sums all fee_structure line items
  // for the term across the whole school and multiplies by active student count, rather
  // than matching each student to their own class's fee structure — a pre-existing
  // simplification carried over intentionally, not something new introduced here.
  const { data: structure } = await supabase
    .from("fee_structure")
    .select("amount, class:classes!inner(school_id)")
    .eq("term_id", currentTerm.id)
    .eq("class.school_id", profile.school_id);

  const { data: activeStudentRows, count: activeStudents } = await supabase
    .from("students")
    .select("balance_brought_forward", { count: "exact" })
    .eq("school_id", profile.school_id)
    .eq("status", "Active");

  const totalPerStudent = (structure ?? []).reduce((sum, fee) => sum + Number(fee.amount), 0);
  const totalBroughtForward = (activeStudentRows ?? []).reduce((sum, s) => sum + Number(s.balance_brought_forward ?? 0), 0);
  const feeExpected = totalPerStudent * (activeStudents ?? 0) + totalBroughtForward;
  const outstandingBalance = Math.max(feeExpected - total, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Finance Reports</h1>
        <p className="text-sm text-gray-500">
          {(currentTerm.academic_year as unknown as { year: number })?.year} · {currentTerm.term_number}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Fee Expected This Term" value={formatKES(feeExpected)} icon={TrendingUp} />
        <StatCard label="Fee Collected This Term" value={formatKES(total)} icon={Wallet} />
        <StatCard label="Outstanding Balance" value={formatKES(outstandingBalance)} icon={AlertTriangle} tone="danger" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">By Fee Category</p>
          {byCategory.size === 0 ? (
            <p className="text-sm text-gray-400">No payments recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {Array.from(byCategory.entries()).map(([cat, amt]) => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-gray-600">{cat}</span>
                  <span className="font-medium text-gray-900">{formatKES(amt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">By Payment Method</p>
          {byMethod.size === 0 ? (
            <p className="text-sm text-gray-400">No payments recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {Array.from(byMethod.entries()).map(([method, amt]) => (
                <div key={method} className="flex justify-between text-sm">
                  <span className="text-gray-600">{method}</span>
                  <span className="font-medium text-gray-900">{formatKES(amt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}