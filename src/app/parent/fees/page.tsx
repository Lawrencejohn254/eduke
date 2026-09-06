import { getProfileOrRedirect } from "@/lib/get-profile";
import { getChildrenForGuardian } from "@/lib/get-children";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/Loaders";
import ChildSelector from "@/components/ChildSelector";
import StatusBadge from "@/components/StatusBadge";
import { formatKES, formatDateDMY } from "@/lib/format";
import PayFeesButton from "./PayFeesButton";
import FeeStructureCard from "./FeeStructureCard";

export default async function ParentFeesPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; paid?: string }>;
}) {
  const profile = await getProfileOrRedirect();
  const children = await getChildrenForGuardian(profile.guardian_id);
  const params = await searchParams;

  if (children.length === 0) {
    return <EmptyState title="No children linked yet" description="Contact the school office to link your account to your child's record." />;
  }

  const activeChild = children.find((c) => c.id === params.child) ?? children[0];
  const supabase = await createClient();

  const { data: currentTerm } = await supabase
    .from("terms")
    .select("id, term_number, academic_year:academic_years(year)")
    .eq("is_current", true)
    .maybeSingle();

  const termLabel = currentTerm
    ? `${currentTerm.term_number} ${(currentTerm.academic_year as unknown as { year: number })?.year ?? ""}`
    : "No current term";

  let expected = 0;
  let breakdown: { category: string; amount: number; mandatory: boolean; description: string | null }[] = [];
  if (currentTerm && activeChild.class_id) {
    const { data: structure } = await supabase
      .from("fee_structure")
      .select("fee_category, amount, is_mandatory, description")
      .eq("term_id", currentTerm.id)
      .eq("class_id", activeChild.class_id);
    breakdown = (structure ?? []).map((s) => ({
      category: s.fee_category ?? "Other",
      amount: Number(s.amount),
      mandatory: s.is_mandatory,
      description: s.description,
    }));
    expected = breakdown.reduce((s, f) => s + f.amount, 0);
  }

  const { data: studentRow } = await supabase.from("students").select("balance_brought_forward").eq("id", activeChild.id).maybeSingle();
  const broughtForward = Number(studentRow?.balance_brought_forward ?? 0);

  const { data: payments } = await supabase
    .from("fee_payments")
    .select("id, amount, payment_method, receipt_number, payment_date, status")
    .eq("student_id", activeChild.id)
    .order("payment_date", { ascending: false });

  const paid = (payments ?? []).filter((p) => p.status === "Confirmed").reduce((s, p) => s + Number(p.amount), 0);
  const balance = Math.max(expected + broughtForward - paid, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fees (Ada)</h1>
          <p className="text-sm text-gray-500">{activeChild.first_name} {activeChild.last_name}</p>
        </div>
        <ChildSelector children={children.map((c) => ({ id: c.id, first_name: c.first_name, last_name: c.last_name, className: c.className }))} />
      </div>

      {params.paid && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-2">
          Payment received — thank you!
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-sm text-gray-500">{termLabel}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          Balance: <span className={balance > 0 ? "text-red-600" : "text-eduke-green"}>{formatKES(balance)}</span>
        </p>
        {broughtForward !== 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Includes brought forward from previous term: <strong className={broughtForward > 0 ? "text-red-600" : "text-eduke-green"}>{formatKES(broughtForward)}</strong>
          </p>
        )}
        {balance > 0 && <PayFeesButton studentId={activeChild.id} amount={balance} />}
      </div>

      <FeeStructureCard className={activeChild.className ?? ""} termLabel={termLabel} rows={breakdown} />

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Payment History</p>
        {!payments || payments.length === 0 ? (
          <EmptyState title="No payments yet" description="Your payment history will appear here." />
        ) : (
          <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
            <table>
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="p-3">Receipt</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="p-3 font-mono text-xs text-gray-600">{p.receipt_number}</td>
                    <td className="p-3 font-medium">{formatKES(p.amount)}</td>
                    <td className="p-3 text-gray-600">{p.payment_method}</td>
                    <td className="p-3 text-gray-500 text-xs">{formatDateDMY(p.payment_date)}</td>
                    <td className="p-3"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}