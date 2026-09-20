"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Trash2 } from "lucide-react";
import { formatDateDMY } from "@/lib/format";

type Notice = { id: string; title: string; message: string; audience: string; created_at: string; expires_at: string | null };

const AUDIENCES = [
  { value: "all", label: "Everyone" },
  { value: "teacher", label: "Teachers" },
  { value: "bursar", label: "Bursar" },
  { value: "librarian", label: "Librarian" },
  { value: "support_staff", label: "All Support Staff" },
  { value: "Secretary/Receptionist", label: "Secretary/Receptionist" },
  { value: "ICT Support", label: "ICT Support" },
  { value: "Nurse/Health Staff", label: "Nurse/Health Staff" },
  { value: "Storekeeper", label: "Storekeeper" },
  { value: "Transport Officer", label: "Transport Officer" },
  { value: "Security", label: "Security" },
];

export default function NoticesAdminClient({ notices }: { notices: Notice[] }) {
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("notices").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors">
        <Plus size={15} /> New Notice
      </button>

      {notices.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No notices sent yet.</p>
      ) : (
        <div className="space-y-2">
          {notices.map((n) => (
            <div key={n.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                <p className="text-[11px] text-gray-400 mt-2">
                  {formatDateDMY(n.created_at)} · {n.audience === "all" ? "Everyone" : n.audience}
                </p>
              </div>
              <button onClick={() => handleDelete(n.id)} className="text-gray-400 hover:text-red-600 shrink-0" title="Delete notice">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && <NoticeForm onClose={() => setShowForm(false)} />}
    </div>
  );

  function NoticeForm({ onClose }: { onClose: () => void }) {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [audience, setAudience] = useState("all");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setSaving(true);
      setError(null);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: myProfile } = await supabase.from("profiles").select("school_id").eq("id", user?.id ?? "").maybeSingle();

      const { error: insertError } = await supabase.from("notices").insert({
        school_id: myProfile?.school_id,
        title,
        message,
        audience,
        created_by: user?.id ?? null,
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
            <h2 className="font-semibold text-gray-900">New Notice</h2>
            <button onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <textarea required placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
              {saving && <Loader2 size={16} className="animate-spin" />} Send Notice
            </button>
          </form>
        </div>
      </div>
    );
  }
}