import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { EmptyState } from "@/components/Loaders";
import DefaultersClient from "./DefaultersClient";

export default async function FeeBalancesPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: currentTerm } = await supabase
    .from("terms")
    .select("id, term_number")
    .eq("is_current", true)
    .maybeSingle();

  if (!currentTerm) {
    return <EmptyState title="No current term set" description="Set a current term in Settings to compute fee balances." />;
  }

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name, admission_number, class_id, balance_brought_forward, class:classes(id, name)")
    .eq("school_id", profile.school_id)
    .eq("status", "Active");

  const { data: structure } = await supabase
    .from("fee_structure")
    .select("class_id, amount, class:classes!inner(school_id)")
    .eq("term_id", currentTerm.id)
    .eq("class.school_id", profile.school_id);

  const expectedByClass = new Map<string, number>();
  for (const f of structure ?? []) {
    expectedByClass.set(f.class_id, (expectedByClass.get(f.class_id) ?? 0) + Number(f.amount));
  }

  const { data: payments } = await supabase
    .from("fee_payments")
    .select("student_id, amount, student:students!inner(school_id)")
    .eq("term_id", currentTerm.id)
    .eq("status", "Confirmed")
    .eq("student.school_id", profile.school_id);

  const paidByStudent = new Map<string, number>();
  for (const p of payments ?? []) {
    paidByStudent.set(p.student_id, (paidByStudent.get(p.student_id) ?? 0) + Number(p.amount));
  }

  const { data: guardianLinks } = await supabase
    .from("student_guardians")
    .select("student_id, guardian:guardians(phone_primary)")
    .eq("is_primary", true);

  const phoneByStudent = new Map<string, string>();
  for (const g of guardianLinks ?? []) {
    const guardian = g.guardian as unknown as { phone_primary: string } | null;
    if (guardian) phoneByStudent.set(g.student_id, guardian.phone_primary);
  }

  const allBalances = (students ?? [])
    .map((s) => {
      const klass = s.class as unknown as { id: string; name: string } | null;
      const expected = klass ? expectedByClass.get(klass.id) ?? 0 : 0;
      const paid = paidByStudent.get(s.id) ?? 0;
      const broughtForward = Number(s.balance_brought_forward ?? 0);
      const balance = expected + broughtForward - paid;
      return {
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        admission: s.admission_number,
        className: klass?.name ?? "-",
        expected,
        broughtForward,
        paid,
        balance,
        phone: phoneByStudent.get(s.id) ?? null,
      };
    })
    .sort((a, b) => b.balance - a.balance);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Fee Balances</h1>
        <p className="text-sm text-gray-500">
          {allBalances.length} active students · {currentTerm.term_number}
        </p>
      </div>

      {allBalances.length === 0 ? (
        <EmptyState title="No students found" description="Fee balances will appear here once students and fee structures are set up." />
      ) : (
        <DefaultersClient balances={allBalances} />
      )}
    </div>
  );
}