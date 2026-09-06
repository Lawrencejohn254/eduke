"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type StreamOption = { id: string; name: string; class: { id: string; name: string } | null };

const RELATIONSHIPS = ["Mother", "Father", "Guardian", "Uncle", "Aunt", "Grandparent", "Other"];

export default function NewStudentForm({ streams, schoolId }: { streams: StreamOption[]; schoolId: string }) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [gender, setGender] = useState("Male");
  const [streamId, setStreamId] = useState(streams[0]?.id ?? "");
  const [dob, setDob] = useState("");
  const [kcpe, setKcpe] = useState("");
  const [nemis, setNemis] = useState("");
  const [prevSchool, setPrevSchool] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState(RELATIONSHIPS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const stream = streams.find((s) => s.id === streamId);
    const supabase = createClient();

    const { data: student, error: studentError } = await supabase
      .from("students")
      .insert({
        school_id: schoolId,
        admission_number: admissionNumber,
        first_name: firstName,
        last_name: lastName,
        gender,
        stream_id: streamId || null,
        class_id: stream?.class?.id ?? null,
        date_of_birth: dob || null,
        kcpe_index: kcpe || null,
        nemis_id: nemis || null,
        previous_school: prevSchool || null,
      })
      .select()
      .single();

    if (studentError) {
      setError(studentError.message);
      setSaving(false);
      return;
    }

    // Link a parent/guardian if details were provided. If a guardian with this phone
    // already exists (e.g. a sibling was added earlier), reuse it instead of duplicating.
    if (guardianName && guardianPhone) {
      const { data: existingGuardian } = await supabase
        .from("guardians")
        .select("id")
        .eq("phone_primary", guardianPhone)
        .maybeSingle();

      let guardianId = existingGuardian?.id;

      if (!guardianId) {
        const { data: newGuardian, error: guardianError } = await supabase
          .from("guardians")
          .insert({
            full_name: guardianName,
            phone_primary: guardianPhone,
            relationship: guardianRelationship,
          })
          .select()
          .single();
        if (guardianError) {
          setError(`Student saved, but linking guardian failed: ${guardianError.message}`);
          setSaving(false);
          router.refresh();
          return;
        }
        guardianId = newGuardian.id;
      }

      const { error: linkError } = await supabase.from("student_guardians").insert({
        student_id: student.id,
        guardian_id: guardianId,
        is_primary: true,
        fee_payer: true,
      });
      if (linkError) {
        setError(`Student saved, but linking guardian failed: ${linkError.message}`);
        setSaving(false);
        router.refresh();
        return;
      }
    }

    setSaving(false);
    setOpen(false);
    setFirstName("");
    setLastName("");
    setAdmissionNumber("");
    setDob("");
    setKcpe("");
    setNemis("");
    setPrevSchool("");
    setGuardianName("");
    setGuardianPhone("");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors"
      >
        <Plus size={15} /> Add Student
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-900">Add Student</h2>
              <button onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <input required placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <input required placeholder="Admission number" value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option>Male</option>
                <option>Female</option>
              </select>
              <select value={streamId} onChange={(e) => setStreamId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {streams.map((s) => (
                  <option key={s.id} value={s.id}>{s.class?.name} {s.name}</option>
                ))}
              </select>

              <div>
                <label className="text-xs font-medium text-gray-500">Date of Birth</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1" />
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

              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-2">Parent / Guardian (optional — links them to view fees, results & attendance)</p>
                <div className="space-y-2">
                  <input placeholder="Guardian full name" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input placeholder="Guardian phone (e.g. 0722000000)" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <select value={guardianRelationship} onChange={(e) => setGuardianRelationship(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <p className="text-[11px] text-gray-400">
                    This links the student to the guardian's record. The guardian will only be able to log in once their account is created separately (via Supabase Auth) using this phone number.
                  </p>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50"
              >
                {saving && <Loader2 size={16} className="animate-spin" />} Save Student
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
