import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import ExpensesClient from "./ExpensesClient";

export default async function ExpensesPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, category, custom_category, description, amount, expense_date, payment_method, reference, staff:recorded_by(first_name, last_name)")
    .eq("school_id", profile.school_id)
    .order("expense_date", { ascending: false })
    .limit(500);

  const { data: school } = await supabase.from("schools").select("name").eq("id", profile.school_id).maybeSingle();

  const normalized = (expenses ?? []).map((e) => {
    const staff = e.staff as unknown as { first_name: string; last_name: string } | null;
    return {
      id: e.id as string,
      category: e.category as string,
      custom_category: e.custom_category as string | null,
      description: e.description as string | null,
      amount: Number(e.amount),
      expense_date: e.expense_date as string,
      payment_method: e.payment_method as string | null,
      reference: e.reference as string | null,
      recorded_by_name: staff ? `${staff.first_name} ${staff.last_name}` : null,
    };
  });

  return (
    <ExpensesClient
      expenses={normalized}
      canRecord={profile.role === "bursar"}
      recordedBy={profile.staff_id}
      schoolName={school?.name ?? ""}
    />
  );
}