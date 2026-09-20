import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Single source of truth for a child's fee position in the parent portal.
 *
 * Formula (identical to what the bursar sees in Fee Balances and on the student page):
 *   balance = current-term fee structure  +  balance brought forward  −  current-term CONFIRMED payments
 *
 * Previously the parent Fees page subtracted payments from *every* term and the dashboard ignored
 * the brought-forward balance, so the two screens could disagree with each other and with the school.
 */
export type FeeStructureRow = { category: string; amount: number; mandatory: boolean; description: string | null };

export type FeeSummary = {
  termFees: number;
  broughtForward: number;
  /** termFees + broughtForward */
  totalDue: number;
  paid: number;
  /** raw balance — can be negative when the parent has overpaid / holds a credit */
  balance: number;
  /** amount still owed, never negative */
  outstanding: number;
  /** overpayment / credit, never negative */
  credit: number;
  /** 0–100, share of totalDue that has been paid */
  percentPaid: number;
  status: "paid" | "partial" | "unpaid" | "none";
};

export function computeFeeSummary(input: { termFees: number; broughtForward: number; paid: number }): FeeSummary {
  const termFees = round2(input.termFees);
  const broughtForward = round2(input.broughtForward);
  const paid = round2(input.paid);
  const totalDue = round2(termFees + broughtForward);
  const balance = round2(totalDue - paid);
  const outstanding = Math.max(balance, 0);
  const credit = Math.max(-balance, 0);
  const percentPaid = totalDue > 0 ? Math.max(0, Math.min(100, Math.round((paid / totalDue) * 100))) : paid > 0 ? 100 : 0;

  let status: FeeSummary["status"];
  if (totalDue <= 0 && paid <= 0) status = "none";
  else if (outstanding <= 0) status = "paid";
  else if (paid > 0) status = "partial";
  else status = "unpaid";

  return { termFees, broughtForward, totalDue, paid, balance, outstanding, credit, percentPaid, status };
}

function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

type StructureQueryRow = {
  class_id: string | null;
  fee_category: string | null;
  amount: number | string;
  is_mandatory: boolean | null;
  description: string | null;
};

/** Fee structure for one class in one term (RLS: parent may only read their own children's classes). */
export async function getFeeStructure(supabase: SupabaseClient, termId: string, classId: string): Promise<FeeStructureRow[]> {
  const { data } = await supabase
    .from("fee_structure")
    .select("class_id, fee_category, amount, is_mandatory, description")
    .eq("term_id", termId)
    .eq("class_id", classId);

  return ((data ?? []) as StructureQueryRow[]).map((s) => ({
    category: s.fee_category ?? "Other",
    amount: Number(s.amount),
    mandatory: s.is_mandatory ?? true,
    description: s.description,
  }));
}

/** Current-term confirmed payments + brought-forward for one child, folded into a FeeSummary. */
export async function getFeeSummary(
  supabase: SupabaseClient,
  args: { studentId: string; classId: string | null; termId: string | null }
): Promise<{ summary: FeeSummary; structure: FeeStructureRow[] }> {
  const { studentId, classId, termId } = args;

  const [structure, studentRes, paymentsRes] = await Promise.all([
    termId && classId ? getFeeStructure(supabase, termId, classId) : Promise.resolve<FeeStructureRow[]>([]),
    supabase.from("students").select("balance_brought_forward").eq("id", studentId).maybeSingle(),
    termId
      ? supabase.from("fee_payments").select("amount").eq("student_id", studentId).eq("term_id", termId).eq("status", "Confirmed")
      : Promise.resolve({ data: [] as { amount: number | string }[] }),
  ]);

  const termFees = structure.reduce((s, f) => s + f.amount, 0);
  const paid = ((paymentsRes.data ?? []) as { amount: number | string }[]).reduce((s, p) => s + Number(p.amount), 0);
  const broughtForward = Number((studentRes.data as { balance_brought_forward: number | string | null } | null)?.balance_brought_forward ?? 0);

  return { summary: computeFeeSummary({ termFees, broughtForward, paid }), structure };
}
