"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { departmentOptionsForRole } from "@/lib/departments";

const ROLES = [
  "teacher",
  "hod",
  "deputy_principal",
  "principal",
  "bursar",
  "librarian",
  "secretary",
  "support_staff",
];

const CONTRACT_TYPES = [
  "Permanent",
  "Contract",
  "Intern",
  "Part-time",
  "Casual",
];

const STATUSES = [
  "Active",
  "Inactive",
  "Suspended",
  "On Leave",
];

export default function NewStaffForm({ schoolId }: { schoolId: string }) {
  const [open, setOpen] = useState(false);

  // Personal Information
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Employment Information
  const [staffNumber, setStaffNumber] = useState("");
  const [tscNumber, setTscNumber] = useState("");
  const [role, setRole] = useState("teacher");
  const [department, setDepartment] = useState("");
  const [contractType, setContractType] = useState("");
  const [dateJoined, setDateJoined] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState("Active");

  // Identification & Statutory
  const [nationalId, setNationalId] = useState("");
  const [kraPin, setKraPin] = useState("");
  const [nhifNumber, setNhifNumber] = useState("");
  const [nssfNumber, setNssfNumber] = useState("");

  // Payroll
  const [basicSalary, setBasicSalary] = useState("");

  // UI
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  function resetForm() {
    setFirstName("");
    setLastName("");
    setGender("");
    setPhone("");
    setEmail("");

    setStaffNumber("");
    setTscNumber("");
    setRole("teacher");
    setDepartment("");
    setContractType("");
    setDateJoined(new Date().toISOString().slice(0, 10));
    setStatus("Active");

    setNationalId("");
    setKraPin("");
    setNhifNumber("");
    setNssfNumber("");

    setBasicSalary("");
    setError(null);
  }

  function handleClose() {
    setOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError(null);

    const supabase = createClient();

    const { error } = await supabase.from("staff").insert({
      school_id: schoolId,

      // Personal
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      gender,
      phone: phone.trim(),
      email: email.trim() || null,

      // Employment
      staff_number: staffNumber.trim() || null,
      tsc_number: tscNumber.trim() || null,
      role,
      department: department || null,
      contract_type: contractType || null,
      date_joined: dateJoined || null,
      status,

      // Identification
      national_id: nationalId.trim() || null,
      kra_pin: kraPin.trim().toUpperCase() || null,
      nhif_number: nhifNumber.trim() || null,
      nssf_number: nssfNumber.trim() || null,

      // Payroll
      basic_salary: basicSalary
        ? Number(basicSalary)
        : null,
    });

    setSaving(false);

    if (error) {
      console.error("Error adding staff:", error);
      setError(error.message);
      return;
    }

    resetForm();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {/* OPEN MODAL BUTTON */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors"
      >
        <Plus size={15} />
        Add Staff
      </button>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">

            {/* HEADER */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">

              <div>
                <h2 className="font-semibold text-gray-900 text-lg">
                  Add Staff Member
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  Add the staff member's personal, employment and statutory details.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-900"
              >
                <X size={20} />
              </button>

            </div>

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-7"
            >

              {/* PERSONAL INFORMATION */}
              <section>

                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <input
                    required
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />

                  <input
                    required
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />

                  <select
                    required
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>

                  <input
                    required
                    type="tel"
                    placeholder="Phone (e.g. 0711000000)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />

                  <input
                    type="email"
                    placeholder="Email address (optional)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm md:col-span-2"
                  />

                </div>

              </section>


              {/* EMPLOYMENT INFORMATION */}
              <section>

                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Employment Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <input
                    placeholder="Staff number"
                    value={staffNumber}
                    onChange={(e) => setStaffNumber(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />

                  <input
                    placeholder="TSC number"
                    value={tscNumber}
                    onChange={(e) => setTscNumber(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />

                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      setDepartment("");
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r
                          .replaceAll("_", " ")
                          .replace(/\b\w/g, (char) => char.toUpperCase())}
                      </option>
                    ))}
                  </select>

                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white"
                  >
                    <option value="">Select department</option>

                    {departmentOptionsForRole(role).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <select
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white"
                  >
                    <option value="">Contract type</option>

                    {CONTRACT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={dateJoined}
                    onChange={(e) => setDateJoined(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />

                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  >
                    {STATUSES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                </div>

              </section>


              {/* IDENTIFICATION */}
              <section>

                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Identification & Statutory Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <input
                    placeholder="National ID number"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />

                  <input
                    placeholder="KRA PIN"
                    value={kraPin}
                    onChange={(e) => setKraPin(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm uppercase"
                  />

                  <input
                    placeholder="NHIF / SHA number"
                    value={nhifNumber}
                    onChange={(e) => setNhifNumber(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />

                  <input
                    placeholder="NSSF number"
                    value={nssfNumber}
                    onChange={(e) => setNssfNumber(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />

                </div>

              </section>


              {/* PAYROLL */}
              <section>

                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Payroll Information
                </h3>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Basic salary (KES)"
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />

              </section>


              {/* ERROR */}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  <p className="text-sm text-red-600">
                    {error}
                  </p>
                </div>
              )}


              {/* ACTIONS */}
              <div className="flex gap-3 pt-2">

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={saving}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium rounded-lg py-2.5 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm hover:bg-eduke-green-dark disabled:opacity-50"
                >
                  {saving && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {saving
                    ? "Saving..."
                    : "Save Staff Member"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}
    </>
  );
}