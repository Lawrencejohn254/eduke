import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import FeeStructureClient from "./FeeStructureClient";

export default async function FeeStructurePage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: currentTerm } = await supabase
    .from("terms")
    .select("id, term_number, academic_year:academic_years(year)")
    .eq("is_current", true)
    .maybeSingle();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("school_id", profile.school_id)
    .order("name");

  let existingRows: { class_id: string; fee_category: string; amount: number; is_mandatory: boolean; description: string | null }[] = [];
  if (currentTerm) {
    const { data } = await supabase
      .from("fee_structure")
      .select("class_id, fee_category, amount, is_mandatory, description, class:classes!inner(school_id)")
      .eq("term_id", currentTerm.id)
      .eq("class.school_id", profile.school_id);
    existingRows = (data ?? []).map((r) => ({
      class_id: r.class_id,
      fee_category: r.fee_category,
      amount: Number(r.amount),
      is_mandatory: r.is_mandatory,
      description: r.description,
    }));
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Fee Structure</h1>
        <p className="text-sm text-gray-500">
          {currentTerm ? `${currentTerm.term_number} ${(currentTerm.academic_year as unknown as { year: number })?.year ?? ""}` : "No current term set"}
        </p>
      </div>

      {!currentTerm ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          Set a current term in Settings before defining fee structures.
        </p>
      ) : (
        <FeeStructureClient
          termId={currentTerm.id}
          termLabel={`${currentTerm.term_number} ${(currentTerm.academic_year as unknown as { year: number })?.year ?? ""}`}
          classes={classes ?? []}
          existingRows={existingRows}
        />
      )}
    </div>
  );
}