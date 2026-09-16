"use client";

import { useEffect, useState } from "react";
import { UserPlus, Loader2, X, ShieldAlert, ShieldCheck, BadgeCheck, Clock3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const RELATIONSHIPS = ["Mother", "Father", "Guardian", "Uncle", "Aunt", "Grandparent", "Other"];

type LinkedGuardian = {
  linkId: string;
  guardianId: string;
  profileId: string | null;
  fullName: string;
  phone: string;
  relationship: string | null;
  isPrimary: boolean;
  feePayer: boolean;
  isVerified: boolean;
  isStaffGuardian: boolean;
};

type LinkableStaff = {
  staff_id: string;
  profile_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  staff_role: string;
};

export default function LinkGuardianInline({
  studentId,
  canEdit,
  // Pass true only for principal / deputy_principal / super_admin viewing this
  // student's profile. Server-side this maps to the same roles required by
  // admin_add_staff_guardian_link / admin_verify_guardian_link / admin_unlink_guardian
  // in Supabase — this prop is a UI convenience only, RLS + those RPCs are the
  // real enforcement, so a non-admin sending these calls directly still fails server-side.
  canLinkStaff = false,
}: {
  studentId: string;
  canEdit: boolean;
  canLinkStaff?: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [guardians, setGuardians] = useState<LinkedGuardian[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  // External guardian (existing flow — unchanged)
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState(RELATIONSHIPS[0]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Staff/teacher guardian (new flow — admin only)
  const [staffOpen, setStaffOpen] = useState(false);
  const [staffOptions, setStaffOptions] = useState<LinkableStaff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [selectedStaffProfileId, setSelectedStaffProfileId] = useState("");
  const [staffRelationship, setStaffRelationship] = useState<"Father" | "Mother" | "Guardian">(
    "Father"
  );
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffMessage, setStaffMessage] = useState<string | null>(null);

  async function loadGuardians() {
    setLoadingList(true);
    const { data, error } = await supabase
      .from("student_guardians")
      .select(
        `
        id,
        is_primary,
        fee_payer,
        is_verified,
        guardian:guardians(
          id,
          full_name,
          phone_primary,
          relationship,
          profile_id,
          profile:profiles(staff_id)
        )
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
          profile: { staff_id: string | null }[] | { staff_id: string | null } | null;
        };
        const profileRow = Array.isArray(g.profile) ? g.profile[0] : g.profile;
        const isStaffGuardian = !!profileRow?.staff_id;

        return {
          linkId: row.id,
          guardianId: g.id,
          profileId: g.profile_id,
          fullName: g.full_name,
          phone: g.phone_primary,
          relationship: g.relationship,
          isPrimary: row.is_primary,
          feePayer: row.fee_payer,
          isVerified: row.is_verified,
          isStaffGuardian,
        };
      });

    setGuardians(mapped);
    setLoadingList(false);
  }

  async function loadLinkableStaff() {
    setLoadingStaff(true);
    const { data, error } = await supabase.rpc("list_linkable_staff_for_guardian");
    setLoadingStaff(false);

    if (error) {
      setStaffMessage(`Error: ${error.message}`);
      return;
    }

    // Hide staff already linked to this student so the picker can't produce a
    // confusing duplicate-link attempt (the RPC handles duplicates safely
    // either way, this is just UX polish).
    const alreadyLinkedProfileIds = new Set(guardians.map((g) => g.profileId).filter(Boolean));
    setStaffOptions((data ?? []).filter((s: LinkableStaff) => !alreadyLinkedProfileIds.has(s.profile_id)));
  }

  useEffect(() => {
    loadGuardians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function handleUnlink(guardian: LinkedGuardian) {
    setUnlinkingId(guardian.linkId);
    setListError(null);

    // Staff-guardian links go through the admin RPC so profiles.guardian_id
    // gets cleaned up correctly when this was their only verified link.
    // Plain external guardians keep using the direct table delete as before.
    const { error } = guardian.isStaffGuardian
      ? await supabase.rpc("admin_unlink_guardian", { p_student_guardian_id: guardian.linkId })
      : await supabase.from("student_guardians").delete().eq("id", guardian.linkId);

    setUnlinkingId(null);
    setConfirmingId(null);

    if (error) {
      setListError(error.message);
      return;
    }

    setGuardians((prev) => prev.filter((g) => g.linkId !== guardian.linkId));
    router.refresh();
  }

  async function handleVerify(linkId: string) {
    setVerifyingId(linkId);
    setListError(null);

    const { error } = await supabase.rpc("admin_verify_guardian_link", {
      p_student_guardian_id: linkId,
    });

    setVerifyingId(null);

    if (error) {
      setListError(error.message);
      return;
    }

    await loadGuardians();
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
      // External guardians created through this flow are treated as
      // already-established relationships, same as before this feature existed.
      is_verified: true,
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

  async function handleLinkStaff() {
    if (!selectedStaffProfileId) return;
    setStaffBusy(true);
    setStaffMessage(null);

    const { error } = await supabase.rpc("admin_add_staff_guardian_link", {
      p_student_id: studentId,
      p_staff_profile_id: selectedStaffProfileId,
      p_relationship: staffRelationship,
    });

    setStaffBusy(false);

    if (error) {
      setStaffMessage(`Error: ${error.message}`);
      return;
    }

    setStaffMessage("Link created — pending verification below.");
    setSelectedStaffProfileId("");
    setStaffOpen(false);
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
                  {g.isStaffGuardian && (
                    <span className="ml-1 text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                      Staff account
                    </span>
                  )}
                  {g.isStaffGuardian &&
                    (g.isVerified ? (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-eduke-green bg-green-50 px-1.5 py-0.5 rounded">
                        <BadgeCheck size={10} /> Verified
                      </span>
                    ) : (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                        <Clock3 size={10} /> Pending verification
                      </span>
                    ))}
                </p>
                <p className="text-xs text-gray-500">
                  {g.phone}
                  {g.relationship ? ` · ${g.relationship}` : ""}
                  {g.profileId ? " · Has portal login" : ""}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {canLinkStaff && g.isStaffGuardian && !g.isVerified && (
                  <button
                    type="button"
                    onClick={() => handleVerify(g.linkId)}
                    disabled={verifyingId === g.linkId}
                    className="flex items-center gap-1 text-xs font-medium text-white bg-eduke-green hover:bg-eduke-green-dark px-2.5 py-1 rounded-lg disabled:opacity-50"
                  >
                    {verifyingId === g.linkId ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={12} />
                    )}{" "}
                    Verify
                  </button>
                )}

                {canEdit && (
                  <>
                    {confirmingId === g.linkId ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUnlink(g)}
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
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {confirmingId && (
        <p className="flex items-start gap-1.5 text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
          <ShieldAlert size={13} className="mt-0.5 shrink-0" />
          This immediately removes this guardian&apos;s access to this student&apos;s
          attendance, exams, fees and homework — even if they&apos;re actively using
          the parent portal or, for a staff account, the My Children page.
        </p>
      )}

      {listError && <p className="text-xs text-red-500">{listError}</p>}

      {/* =====================================================
          ADD EXTERNAL GUARDIAN (existing flow, unchanged)
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

      {/* =====================================================
          LINK A STAFF MEMBER AS GUARDIAN (new — Principal/Admin only)
          Student -> Guardians -> Add/Link Guardian -> Relationship -> Verify
      ====================================================== */}

      {canLinkStaff &&
        (!staffOpen ? (
          <button
            onClick={() => {
              setStaffOpen(true);
              loadLinkableStaff();
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:underline mt-1"
          >
            <ShieldCheck size={13} /> Link a Staff Member (Teacher/Parent Portal)
          </button>
        ) : (
          <div className="mt-2 border border-purple-100 rounded-lg p-3 space-y-1.5 bg-purple-50/40">
            <p className="text-[11px] text-gray-500">
              Links an existing teacher/staff account to this student. They&apos;ll see this
              child in their own account&apos;s My Children page once you verify it below — no
              second account is created.
            </p>

            {loadingStaff ? (
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Loading staff...
              </p>
            ) : (
              <div className="flex gap-1.5">
                <select
                  value={selectedStaffProfileId}
                  onChange={(e) => setSelectedStaffProfileId(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
                >
                  <option value="">Select staff member...</option>
                  {staffOptions.map((s) => (
                    <option key={s.profile_id} value={s.profile_id}>
                      {s.first_name} {s.last_name} ({s.staff_role})
                    </option>
                  ))}
                </select>
                <select
                  value={staffRelationship}
                  onChange={(e) =>
                    setStaffRelationship(e.target.value as "Father" | "Mother" | "Guardian")
                  }
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLinkStaff}
                disabled={staffBusy || !selectedStaffProfileId}
                className="flex items-center gap-1.5 bg-purple-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {staffBusy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}{" "}
                Create Link (Pending)
              </button>
              <button
                type="button"
                onClick={() => setStaffOpen(false)}
                className="text-xs text-gray-400 hover:underline"
              >
                Cancel
              </button>
            </div>
            {staffMessage && <p className="text-xs text-gray-500">{staffMessage}</p>}
          </div>
        ))}
    </div>
  );
}