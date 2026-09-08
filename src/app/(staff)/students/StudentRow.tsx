"use client";

import { useState } from "react";
import { Pencil, X, Loader2, Eye, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

type StreamOption = { id: string; name: string; class: { id: string; name: string } | null };

const STATUSES = ["Active", "Transferred Out", "Graduated", "Suspended", "Expelled"];
const RELATIONSHIPS = ["Mother", "Father", "Guardian", "Uncle", "Aunt", "Grandparent", "Other"];

export default function StudentRow({
  id,
  admissionNumber,
  firstName,
  lastName,
  gender,
  status,
  streamId,
  dateOfBirth,
  kcpeIndex,
  nemisId,
  previousSchool,
  className,
  streamName,
  streams,
  canEdit,
}: {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  status: string;
  streamId: string | null;
  dateOfBirth: string | null;
  kcpeIndex: string | null;
  nemisId: string | null;
  previousSchool: string | null;
  className: string;
  streamName: string;
  streams: StreamOption[];
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [fName, setFName] = useState(firstName);
  const [lName, setLName] = useState(lastName);
  const [gen, setGen] = useState(gender);
  const [stat, setStat] = useState(status);
  const [strId, setStrId] = useState(streamId ?? streams[0]?.id ?? "");
  const [dob, setDob] = useState(dateOfBirth ?? "");
  const [kcpe, setKcpe] = useState(kcpeIndex ?? "");
  const [nemis, setNemis] = useState(nemisId ?? "");
  const [prevSchool, setPrevSchool] = useState(previousSchool ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Link guardian
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState(RELATIONSHIPS[0]);
  const [guardianBusy, setGuardianBusy] = useState(false);
  const [guardianMessage, setGuardianMessage] = useState<string | null>(null);

  const router = useRouter();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const stream = streams.find((s) => s.id === strId);
    const supabase = createClient();
    const { error } = await supabase
      .from("students")
      .update({
        first_name: fName,
        last_name: lName,
        gender: gen,
        status: stat,
        stream_id: strId || null,
        class_id: stream?.class?.id ?? null,
        date_of_birth: dob || null,
        kcpe_index: kcpe || null,
        nemis_id: nemis || null,
        previous_school: prevSchool || null,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function handleLinkGuardian() {
    if (!guardianName.trim() || !guardianPhone.trim()) return;
    setGuardianBusy(true);
    setGuardianMessage(null);
    const supabase = createClient();

    const { data: existingGuardian } = await supabase
      .from("guardians")
      .select("id")
      .eq("phone_primary", guardianPhone.trim())
      .maybeSingle();

    let guardianId = existingGuardian?.id;

    if (!guardianId) {
      const { data: newGuardian, error: guardianError } = await supabase
        .from("guardians")
        .insert({ full_name: guardianName.trim(), phone_primary: guardianPhone.trim(), relationship: guardianRelationship })
        .select()
        .single();
      if (guardianError) {
        setGuardianBusy(false);
        setGuardianMessage(`Error: ${guardianError.message}`);
        return;
      }
      guardianId = newGuardian.id;
    }

    const { error: linkError } = await supabase.from("student_guardians").insert({
      student_id: id,
      guardian_id: guardianId,
      is_primary: true,
      fee_payer: true,
    });
    setGuardianBusy(false);
    if (linkError) {
      setGuardianMessage(`Error: ${linkError.message}`);
      return;
    }
    setGuardianMessage("Guardian linked.");
    setGuardianName("");
    setGuardianPhone("");
    router.refresh();
  }

  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50">
        <td className="p-3 font-mono text-xs text-gray-600">{admissionNumber}</td>
        <td className="p-3 font-medium text-gray-900">
          <Link href={`/students/${id}`} className="hover:text-eduke-green hover:underline">
            {firstName} {lastName}
          </Link>
        </td>
        <td className="p-3 text-gray-600">{gender}</td>
        <td className="p-3 text-gray-600">{className}</td>
        <td className="p-3 text-gray-600">{streamName}</td>
        <td className="p-3"><StatusBadge status={status} /></td>
        <td className="p-3 flex items-center gap-3">
          <Link href={`/students/${id}`} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-eduke-green hover:underline">
            <Eye size={13} /> View
          </Link>
          {canEdit && (
            <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-xs font-medium text-eduke-green hover:underline">
              <Pencil size={13} /> Edit
            </button>
          )}
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-semibold text-gray-900">Edit Student</h2>
                  <button onClick={() => setOpen(false)}><X size={18} /></button>
                </div>
                <form onSubmit={handleSave} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input required value={fName} onChange={(e) => setFName(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    <input required value={lName} onChange={(e) => setLName(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  </div>
                  <select value={gen} onChange={(e) => setGen(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Date of Birth</label>
                    <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Class / Stream</label>
                    <select value={strId} onChange={(e) => setStrId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1">
                      {streams.map((s) => (
                        <option key={s.id} value={s.id}>{s.class?.name} {s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Status</label>
                    <select value={stat} onChange={(e) => setStat(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1">
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500">KCPE Index</label>
                      <input value={kcpe} onChange={(e) => setKcpe(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">NEMIS Number</label>
                      <input value={nemis} onChange={(e) => setNemis(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Previous School (if transferred)</label>
                    <input
                      value={prevSchool}
                      onChange={(e) => setPrevSchool(e.target.value)}
                      placeholder="e.g. St. Mary's Primary School"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1"
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1"><UserPlus size={13} /> Link a Parent/Guardian</p>
                      <div className="space-y-1.5">
                        <input
                          value={guardianName}
                          onChange={(e) => setGuardianName(e.target.value)}
                          placeholder="Guardian full name"
                          className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
                        />
                        <div className="flex gap-1.5">
                          <input
                            value={guardianPhone}
                            onChange={(e) => setGuardianPhone(e.target.value)}
                            placeholder="Phone (e.g. 0722000000)"
                            className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
                          />
                          <select
                            value={guardianRelationship}
                            onChange={(e) => setGuardianRelationship(e.target.value)}
                            className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                          >
                            {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={handleLinkGuardian}
                          disabled={guardianBusy || !guardianName.trim() || !guardianPhone.trim()}
                          className="flex items-center gap-1.5 bg-white border border-gray-300 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                        >
                          {guardianBusy ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Link Guardian
                        </button>
                      </div>
                      {guardianMessage && <p className="text-xs text-gray-500 mt-1">{guardianMessage}</p>}
                    </div>
                  </div>

                  <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
                    {saving && <Loader2 size={16} className="animate-spin" />} Save Changes
                  </button>
                </form>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}