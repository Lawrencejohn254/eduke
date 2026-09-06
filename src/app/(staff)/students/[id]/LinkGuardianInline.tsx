"use client";

import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const RELATIONSHIPS = ["Mother", "Father", "Guardian", "Uncle", "Aunt", "Grandparent", "Other"];

export default function LinkGuardianInline({ studentId, canEdit }: { studentId: string; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState(RELATIONSHIPS[0]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  if (!canEdit) return null;

  async function handleLink() {
    if (!name.trim() || !phone.trim()) return;
    setBusy(true);
    setMessage(null);
    const supabase = createClient();

    const { data: existingGuardian } = await supabase
      .from("guardians")
      .select("id")
      .eq("phone_primary", phone.trim())
      .maybeSingle();

    let guardianId = existingGuardian?.id;

    if (!guardianId) {
      const { data: newGuardian, error: guardianError } = await supabase
        .from("guardians")
        .insert({ full_name: name.trim(), phone_primary: phone.trim(), relationship })
        .select()
        .single();
      if (guardianError) {
        setBusy(false);
        setMessage(`Error: ${guardianError.message}`);
        return;
      }
      guardianId = newGuardian.id;
    }

    const { error: linkError } = await supabase.from("student_guardians").insert({
      student_id: studentId,
      guardian_id: guardianId,
      is_primary: true,
      fee_payer: true,
    });
    setBusy(false);
    if (linkError) {
      setMessage(`Error: ${linkError.message}`);
      return;
    }
    setMessage("Guardian linked.");
    setName("");
    setPhone("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-eduke-green hover:underline mt-2"
      >
        <UserPlus size={13} /> Link a Parent/Guardian
      </button>
    );
  }

  return (
    <div className="mt-2 border border-gray-100 rounded-lg p-3 space-y-1.5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Guardian full name"
        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
      />
      <div className="flex gap-1.5">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (e.g. 0722000000)"
          className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
        />
        <select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
        >
          {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleLink}
          disabled={busy || !name.trim() || !phone.trim()}
          className="flex items-center gap-1.5 bg-eduke-green text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Link Guardian
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:underline">
          Cancel
        </button>
      </div>
      {message && <p className="text-xs text-gray-500">{message}</p>}
    </div>
  );
}
