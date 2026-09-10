"use client";

import { useEffect, useState } from "react";
import { UserPlus, Loader2, X, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const RELATIONSHIPS = ["Mother", "Father", "Guardian", "Uncle", "Aunt", "Grandparent", "Other"];

type LinkedGuardian = {
  linkId: string;
  guardianId: string;
  fullName: string;
  phone: string;
  relationship: string | null;
  isPrimary: boolean;
  feePayer: boolean;
  hasActiveAccount: boolean;
};

export default function LinkGuardianInline({
  studentId,
  canEdit,
}: {
  studentId: string;
  canEdit: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [guardians, setGuardians] = useState<LinkedGuardian[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState(RELATIONSHIPS[0]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadGuardians() {
    setLoadingList(true);
    const { data, error } = await supabase
      .from("student_guardians")
      .select(
        `
        id,
        is_primary,
        fee_payer,
        guardian:guardians(id, full_name, phone_primary, relationship, profile_id)
        `
      )
      .eq("student_id", studentId);

    if (error) {
      setListError(error.message);
      setLoadingList(false);
      return;
    }

    const mapped: LinkedGuardian[] = (data ?? [])
      .filter((row) => row.guardian)
      .map((row) => {
        const g = row.guardian as unknown as {
          id: string;
          full_name: string;
          phone_primary: string;
          relationship: string | null;
          profile_id: string | null;
        };
        return {
          linkId: row.id,
          guardianId: g.id,
          fullName: g.full_name,
          phone: g.phone_primary,
          relationship: g.relationship,
          isPrimary: row.is_primary,
          feePayer: row.fee_payer,
          hasActiveAccount: !!g.profile_id,
        };
      });

    setGuardians(mapped);
    setLoadingList(false);
  }

  useEffect(() => {
    loadGuardians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function handleUnlink(linkId: string) {
    setUnlinkingId(linkId);
    setListError(null);

    const { error } = await supabase.from("student_guardians").delete().eq("id", linkId);

    setUnlinkingId(null);
    setConfirmingId(null);

    if (error) {
      setListError(error.message);
      return;
    }

    setGuardians((prev) => prev.filter((g) => g.linkId !== linkId));
    router.refresh();
  }

  async function handleLink() {
    if (!name.trim() || !phone.trim()) return;
    setBusy(true);
    setMessage(null);

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
      is_primary: guardians.length === 0,
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
    setOpen(false);
    await loadGuardians();
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {/* =====================================================
          CURRENTLY LINKED GUARDIANS
      ====================================================== */}

      {loadingList ? (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Loading guardians...
        </p>
      ) : guardians.length === 0 ? (
        <p className="text-xs text-gray-400">No parent/guardian linked yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {guardians.map((g) => (
            <li
              key={g.linkId}
              className="flex items-center justify-between gap-2 border border-gray-100 rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {g.fullName}
                  {g.isPrimary && (
                    <span className="ml-1.5 text-[10px] font-semibold text-eduke-green bg-green-50 px-1.5 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                  {g.feePayer && (
                    <span className="ml-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      Fee payer
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {g.phone}
                  {g.relationship ? ` · ${g.relationship}` : ""}
                  {g.hasActiveAccount ? " · Has portal login" : ""}
                </p>
              </div>

              {canEdit && (
                <div className="shrink-0">
                  {confirmingId === g.linkId ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUnlink(g.linkId)}
                        disabled={unlinkingId === g.linkId}
                        className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-lg disabled:opacity-50"
                      >
                        {unlinkingId === g.linkId ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          "Confirm unlink"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="text-xs text-gray-400 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(g.linkId)}
                      className="flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                    >
                      <X size={12} /> Unlink
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {confirmingId && (
        <p className="flex items-start gap-1.5 text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
          <ShieldAlert size={13} className="mt-0.5 shrink-0" />
          This immediately removes this guardian&apos;s access to this student&apos;s
          attendance, exams, fees and homework — even if they&apos;re actively using
          the parent portal.
        </p>
      )}

      {listError && <p className="text-xs text-red-500">{listError}</p>}

      {/* =====================================================
          ADD NEW GUARDIAN
      ====================================================== */}

      {canEdit &&
        (!open ? (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-eduke-green hover:underline mt-2"
          >
            <UserPlus size={13} /> Link a Parent/Guardian
          </button>
        ) : (
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
                {RELATIONSHIPS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLink}
                disabled={busy || !name.trim() || !phone.trim()}
                className="flex items-center gap-1.5 bg-eduke-green text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}{" "}
                Link Guardian
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-gray-400 hover:underline"
              >
                Cancel
              </button>
            </div>
            {message && <p className="text-xs text-gray-500">{message}</p>}
          </div>
        ))}
    </div>
  );
}