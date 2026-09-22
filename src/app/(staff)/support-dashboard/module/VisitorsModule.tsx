"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, LogOut } from "lucide-react";

type Visitor = {
  id: string;
  full_name: string;
  phone: string | null;
  purpose: string | null;
  host_name: string | null;
  host_staff_id: string | null;
  badge_number: string | null;
  check_in_at: string;
  check_out_at: string | null;
};
type StaffOption = { id: string; first_name: string; last_name: string };

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export default function VisitorsModule({
  schoolId,
  profileId,
  visitors,
  staffList,
}: {
  schoolId: string;
  profileId: string;
  visitors: Visitor[];
  staffList: StaffOption[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<"today" | "all">("today");
  const router = useRouter();

  const todayVisitors = useMemo(() => visitors.filter((v) => isToday(v.check_in_at)), [visitors]);
  const checkedInNow = useMemo(() => visitors.filter((v) => !v.check_out_at).length, [visitors]);
  const shown = tab === "today" ? todayVisitors : visitors;

  async function handleCheckOut(id: string) {
    const supabase = createClient();
    await supabase.from("visitors").update({ check_out_at: new Date().toISOString() }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl">
        <StatCard label="Checked In Now" value={checkedInNow} />
        <StatCard label="Visitors Today" value={todayVisitors.length} />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setTab("today")}
            className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px ${tab === "today" ? "border-eduke-green text-eduke-green" : "border-transparent text-gray-500"}`}
          >
            Today
          </button>
          <button
            onClick={() => setTab("all")}
            className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px ${tab === "all" ? "border-eduke-green text-eduke-green" : "border-transparent text-gray-500"}`}
          >
            All Recent
          </button>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors">
          <Plus size={15} /> Check In Visitor
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No visitors recorded.</p>
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Visitor</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Purpose</th>
                <th className="p-3">Visiting</th>
                <th className="p-3">Check In</th>
                <th className="p-3">Check Out</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((v) => (
                <tr key={v.id} className="border-b border-gray-50">
                  <td className="p-3 font-medium text-gray-900">{v.full_name}</td>
                  <td className="p-3 text-gray-600 text-xs">{v.phone ?? "-"}</td>
                  <td className="p-3 text-gray-600 text-xs">{v.purpose ?? "-"}</td>
                  <td className="p-3 text-gray-600 text-xs">{v.host_name ?? "-"}</td>
                  <td className="p-3 text-gray-500 text-xs">
                    {new Date(v.check_in_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="p-3 text-gray-500 text-xs">
                    {v.check_out_at ? new Date(v.check_out_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-"}
                  </td>
                  <td className="p-3">
                    {!v.check_out_at && (
                      <button onClick={() => handleCheckOut(v.id)} className="text-xs font-medium text-eduke-green hover:underline inline-flex items-center gap-1">
                        <LogOut size={12} /> Check Out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <CheckInForm schoolId={schoolId} profileId={profileId} staffList={staffList} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function CheckInForm({
  schoolId,
  profileId,
  staffList,
  onClose,
}: {
  schoolId: string;
  profileId: string;
  staffList: StaffOption[];
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [hostName, setHostName] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const matchedStaff = staffList.find((s) => `${s.first_name} ${s.last_name}` === hostName.trim());

    const { error: insertError } = await supabase.from("visitors").insert({
      school_id: schoolId,
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      purpose: purpose.trim() || null,
      host_name: hostName.trim() || null,
      host_staff_id: matchedStaff?.id ?? null,
      badge_number: badgeNumber.trim() || null,
      logged_by: profileId,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Check In Visitor</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Visitor full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input placeholder="Purpose of visit" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <div>
            <input
              list="visitor-hosts"
              placeholder="Visiting (staff member or office)"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <datalist id="visitor-hosts">
              {staffList.map((s) => (
                <option key={s.id} value={`${s.first_name} ${s.last_name}`} />
              ))}
            </datalist>
          </div>
          <input placeholder="Visitor badge number (optional)" value={badgeNumber} onChange={(e) => setBadgeNumber(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving || !fullName.trim()} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
            {saving && <Loader2 size={16} className="animate-spin" />} Check In
          </button>
        </form>
      </div>
    </div>
  );
}