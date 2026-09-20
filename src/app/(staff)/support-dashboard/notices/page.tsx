import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { Megaphone } from "lucide-react";
import { formatDateDMY } from "@/lib/format";

export default async function SupportNoticesPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: notices, error } = await supabase
    .from("notices")
    .select("id, title, message, audience, created_at")
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Megaphone size={20} /> School Notices
        </h1>
        <p className="text-sm text-gray-500">Announcements from your school administration.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <p className="font-semibold">Could not load notices.</p>
          <p className="mt-1 font-mono text-xs">{error.message}</p>
        </div>
      )}

      {(notices ?? []).length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No notices yet.</p>
      ) : (
        <div className="space-y-3">
          {(notices ?? []).map((n) => (
            <div key={n.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                <span className="text-[11px] text-gray-400 shrink-0">{formatDateDMY(n.created_at)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{n.message}</p>
              {n.audience !== "all" && <p className="text-[11px] text-gray-400 mt-2">For: {n.audience}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}