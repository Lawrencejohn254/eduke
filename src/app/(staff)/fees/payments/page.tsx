import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { EmptyState } from "@/components/Loaders";
import StatusBadge from "@/components/StatusBadge";
import { formatKES, formatDateDMY } from "@/lib/format";
import RecordPaymentForm from "./RecordPaymentForm";
import PrintReceiptButton from "./PrintReceiptButton";

export default async function FeePaymentsPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("fee_payments")
    .select(
      "id, amount, payment_method, mpesa_reference, receipt_number, payment_date, fee_category, status, student:students!inner(first_name, last_name, admission_number, school_id)"
    )
    .eq("student.school_id", profile.school_id)
    .order("payment_date", { ascending: false })
    .limit(100);

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name, admission_number, class:classes(name)")
    .eq("school_id", profile.school_id)
    .order("first_name");

  const { data: currentTerm } = await supabase
    .from("terms")
    .select("id, term_number, academic_year:academic_years(year)")
    .eq("is_current", true)
    .maybeSingle();

  const { data: school } = await supabase
    .from("schools")
    .select("name")
    .eq("id", profile.school_id)
    .maybeSingle();

  const { data: staffRecord } = profile.staff_id
    ? await supabase
        .from("staff")
        .select("first_name, last_name, department")
        .eq("id", profile.staff_id)
        .maybeSingle()
    : { data: null };

  const schoolName = school?.name ?? "";
  const printedBy = staffRecord
  ? `${staffRecord.first_name} ${staffRecord.last_name}${staffRecord.department ? ` · ${staffRecord.department}` : ""}`
  : "Finance Department";

  // Only the Bursar records payments — Principal/Deputy/Super Admin can view but not enter them.
  const canRecord = profile.role === "bursar";

  const studentOptions = (students ?? []).map((s) => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
    admission_number: s.admission_number,
    className: (s.class as unknown as { name: string } | null)?.name ?? "-",
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fee Payments (Ada)</h1>
          <p className="text-sm text-gray-500">Recent fee payments across the school.</p>
        </div>
        {canRecord && currentTerm && (
          <RecordPaymentForm students={studentOptions} termId={currentTerm.id} recordedBy={profile.staff_id} />
        )}
      </div>

      {!canRecord && (
        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          Only the Bursar can record fee payments. You have view-only access here.
        </p>
      )}

      {!payments || payments.length === 0 ? (
        <EmptyState title="No payments recorded yet" description="Fee payments will appear here once recorded." />
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Receipt No.</th>
                <th className="p-3">Student</th>
                <th className="p-3">Category</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Method</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const student = p.student as unknown as { first_name: string; last_name: string; admission_number: string };
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs text-gray-600">{p.receipt_number}</td>
                    <td className="p-3 font-medium text-gray-900">{student.first_name} {student.last_name} <span className="text-gray-400 font-normal">({student.admission_number})</span></td>
                    <td className="p-3 text-gray-600">{p.fee_category ?? "-"}</td>
                    <td className="p-3 font-semibold text-gray-900">{formatKES(p.amount)}</td>
                    <td className="p-3 text-gray-600">
                      {p.payment_method ?? "-"}
                      {p.mpesa_reference && <span className="block text-[11px] text-gray-400 font-mono">{p.mpesa_reference}</span>}
                    </td>
                    <td className="p-3 text-gray-500 text-xs">{formatDateDMY(p.payment_date)}</td>
                    <td className="p-3"><StatusBadge status={p.status} /></td>
                    <td className="p-3">
                      <PrintReceiptButton
                        data={{
                          receiptNumber: p.receipt_number,
                          studentName: `${student.first_name} ${student.last_name}`,
                          admissionNumber: student.admission_number,
                          amount: Number(p.amount),
                          feeCategory: p.fee_category,
                          paymentMethod: p.payment_method,
                          mpesaReference: p.mpesa_reference,
                          paymentDate: p.payment_date ? formatDateDMY(p.payment_date) : null,
                          schoolName,
                          printedBy,
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}