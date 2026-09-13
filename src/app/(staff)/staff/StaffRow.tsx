"use client";

import { useState } from "react";
import {
  Pencil,
  X,
  Loader2,
  Eye,
  Power,
  User,
  Briefcase,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { Trash2, AlertTriangle } from "lucide-react";

const ROLES = [
  "teacher",
  "hod",
  "principal",
  "deputy_principal",
  "bursar",
  "librarian",
  "support_staff",
];

const DEPARTMENTS = [
  "Administration",
  "Mathematics",
  "Sciences",
  "Languages",
  "Humanities",
  "Finance",
  "Support",
];

const STATUSES = [
  "Active",
  "Inactive",
  "On Leave",
  "Suspended",
  "Terminated",
];

const CONTRACT_TYPES = [
  "Permanent",
  "Contract",
  "Internship",
  "Part Time",
];

export default function StaffRow({
  id,
  staffNumber,
  firstName,
  lastName,
  gender,
  role,
  department,
  phone,
  status,
  email,
  tscNumber,
  nationalId,
  kraPin,
  nhifNumber,
  nssfNumber,
  contractType,
  dateJoined,
  basicSalary,
  canEdit,
}: {
  id: string;
  staffNumber: string | null;
  firstName: string;
  lastName: string;
  gender: string | null;
  role: string | null;
  department: string | null;
  phone: string | null;
  status: string;

  email: string | null;
  tscNumber: string | null;
  nationalId: string | null;
  kraPin: string | null;
  nhifNumber: string | null;
  nssfNumber: string | null;
  contractType: string | null;
  dateJoined: string | null;
  basicSalary: number | null;

  canEdit: boolean;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fullName = `${firstName} ${lastName}`.trim();

  // Personal
  const [fName, setFName] = useState(firstName ?? "");
  const [lName, setLName] = useState(lastName ?? "");
  const [gen, setGen] = useState(gender ?? "");
  const [ph, setPh] = useState(phone ?? "");
  const [staffEmail, setStaffEmail] = useState(email ?? "");
  const [staffNo, setStaffNo] = useState(staffNumber ?? "");

  // Employment
  const [rl, setRl] = useState(role ?? "teacher");
  const [dept, setDept] = useState(department ?? "");
  const [tsc, setTsc] = useState(tscNumber ?? "");
  const [contract, setContract] = useState(contractType ?? "");
  const [joined, setJoined] = useState(dateJoined ?? "");
  const [stat, setStat] = useState(status ?? "Active");

  // Statutory
  const [nationalIdValue, setNationalIdValue] = useState(
    nationalId ?? ""
  );
  const [kra, setKra] = useState(kraPin ?? "");
  const [nhif, setNhif] = useState(nhifNumber ?? "");
  const [nssf, setNssf] = useState(nssfNumber ?? "");

  // Payroll
  const [salary, setSalary] = useState(
    basicSalary?.toString() ?? ""
  );

  function populateForm() {
  setFName(firstName ?? "");
  setLName(lastName ?? "");
  setGen(gender ?? "");
  setPh(phone ?? "");
  setStaffEmail(email ?? "");

  setStaffNo(staffNumber ?? "");

  setRl(role ?? "teacher");
  setDept(department ?? "");
  setTsc(tscNumber ?? "");
  setContract(contractType ?? "");
  setJoined(dateJoined ?? "");
  setStat(status ?? "Active");

  setNationalIdValue(nationalId ?? "");
  setKra(kraPin ?? "");
  setNhif(nhifNumber ?? "");
  setNssf(nssfNumber ?? "");

  setSalary(
    basicSalary !== null && basicSalary !== undefined
      ? String(basicSalary)
      : ""
  );

  setError(null);
}

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: fName.trim(),
          last_name: lName.trim(),
          staff_number: staffNo.trim() || null,

          gender: gen || null,
          phone: ph.trim() || null,
          email: staffEmail.trim() || null,

          role: rl,
          department: dept || null,
          tsc_number: tsc.trim() || null,
          contract_type: contract || null,
          date_joined: joined || null,
          status: stat,

          national_id: nationalIdValue.trim() || null,
          kra_pin: kra.trim() || null,
          nhif_number: nhif.trim() || null,
          nssf_number: nssf.trim() || null,

          basic_salary: salary ? Number(salary) : null,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? "Unable to update staff information.");
        return;
      }

      // Let the principal know whether the person's actual login/dashboard
      // access changed, or why it didn't (no login yet, or an HR-only label).
      if (result.portalRoleSkippedReason) {
        alert(result.portalRoleSkippedReason);
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("Unable to update staff information.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName: deleteConfirmText }),
      });

      const result = await res.json();

      if (!res.ok) {
        setDeleteError(result.error ?? "Unable to delete staff member.");
        return;
      }

      setDeleteOpen(false);
      router.refresh();
    } catch {
      setDeleteError("This staff member has history. To preserve school records, deactivate the staff member instead.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeactivate() {
    const confirmDeactivate = window.confirm(
      `Are you sure you want to ${
        status === "Inactive" ? "activate" : "deactivate"
      } ${firstName} ${lastName}?`
    );

    if (!confirmDeactivate) return;

    setDeactivating(true);

    try {
      const supabase = createClient();

      const newStatus =
        status === "Inactive"
          ? "Active"
          : "Inactive";

      const { error } = await supabase
        .from("staff")
        .update({
          status: newStatus,
        })
        .eq("id", id);

      if (error) {
        alert(error.message);
        return;
      }

      router.refresh();
    } catch {
      alert("Unable to update staff status.");
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50">
        <td className="p-3 font-mono text-xs text-gray-600">
          {staffNumber ?? "-"}
        </td>

        <td className="p-3 font-medium text-gray-900">
          <Link
            href={`/staff/${id}`}
            className="hover:text-eduke-green hover:underline"
          >
            {firstName} {lastName}
          </Link>
        </td>

        <td className="p-3 text-gray-600 capitalize">
          {role?.replaceAll("_", " ") ?? "-"}
        </td>

        <td className="p-3 text-gray-600">
          {department ?? "-"}
        </td>

        <td className="p-3 text-gray-600">
          {phone ?? "-"}
        </td>

        <td className="p-3">
          <StatusBadge status={status} />
        </td>

        <td className="p-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/staff/${id}`}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-eduke-green hover:underline"
            >
              <Eye size={13} />
              View
            </Link>

            {canEdit && (
              <>
                <button
                onClick={() => {
                  populateForm();
                  setOpen(true);
                }}
                  className="flex items-center gap-1 text-xs font-medium text-eduke-green hover:underline"
                >
                  <Pencil size={13} />
                  Edit
                </button>

                <button
                  onClick={handleDeactivate}
                  disabled={deactivating}
                  className={`flex items-center gap-1 text-xs font-medium hover:underline ${
                    status === "Inactive"
                      ? "text-eduke-green"
                      : "text-red-600"
                  }`}
                >
                  {deactivating ? (
                    <Loader2
                      size={13}
                      className="animate-spin"
                    />
                  ) : (
                    <Power size={13} />
                  )}

                  {status === "Inactive"
                    ? "Activate"
                    : "Deactivate"}
                </button>

                <button
                  onClick={() => {
                    setDeleteConfirmText("");
                    setDeleteError(null);
                    setDeleteOpen(true);
                  }}
                  className="flex items-center gap-1 text-xs font-medium text-red-700 hover:underline"
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {deleteOpen && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
              <div className="min-h-full flex items-center justify-center py-6">
                <div className="bg-white rounded-xl w-full max-w-md shadow-xl">

                  {/* HEADER */}
                  <div className="flex justify-between items-start p-6 border-b">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg text-gray-900">
                          Delete {firstName} {lastName}?
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          This permanently deletes their staff record and login access.
                          This cannot be undone.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeleteOpen(false)}
                      className="text-gray-500 hover:text-gray-900"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* BODY */}
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-700">
                      Type <span className="font-semibold">{fullName}</span> to confirm.
                    </p>

                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder={fullName}
                      autoFocus
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />

                    {deleteError && (
                      <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                        {deleteError}
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setDeleteOpen(false)}
                        className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting || deleteConfirmText.trim() !== fullName}
                        className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {deleting && <Loader2 size={16} className="animate-spin" />}
                        {deleting ? "Deleting..." : "Delete Permanently"}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </td>
        </tr>
      )}

      {open && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
              <div className="min-h-full flex items-center justify-center py-6">

                <div className="bg-white rounded-xl w-full max-w-3xl shadow-xl">

                  {/* HEADER */}
                  <div className="flex justify-between items-center p-6 border-b">
                    <div>
                      <h2 className="font-semibold text-xl text-gray-900">
                        Edit Staff Member
                      </h2>

                      <p className="text-sm text-gray-500 mt-1">
                        Update staff and payroll information.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="text-gray-500 hover:text-gray-900"
                    >
                      <X size={22} />
                    </button>
                  </div>

                  <form
                    onSubmit={handleSave}
                    className="p-6 space-y-8"
                  >

                    {/* PERSONAL */}
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <User
                          size={19}
                          className="text-eduke-green"
                        />

                        <h3 className="font-semibold text-gray-900">
                          Personal Information
                        </h3>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">

                        <Input
                          label="First Name"
                          value={fName}
                          onChange={setFName}
                          required
                        />

                        <Input
                          label="Last Name"
                          value={lName}
                          onChange={setLName}
                          required
                        />

                        <Input
                          label="Phone Number"
                          value={ph}
                          onChange={setPh}
                        />

                        <Input
                          label="Email Address"
                          value={staffEmail}
                          onChange={setStaffEmail}
                          type="email"
                        />

                        <Select
                          label="Gender"
                          value={gen}
                          onChange={setGen}
                          options={[
                            "",
                            "Male",
                            "Female",
                          ]}
                        />

                        <Input
                          label="National ID"
                          value={nationalIdValue}
                          onChange={setNationalIdValue}
                        />

                      </div>
                    </section>

                    {/* EMPLOYMENT */}
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <Briefcase
                          size={19}
                          className="text-eduke-green"
                        />

                        <h3 className="font-semibold text-gray-900">
                          Employment Information
                        </h3>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">

                        <Select
                          label="Role"
                          value={rl}
                          onChange={setRl}
                          options={ROLES}
                        />

                        <Select
                          label="Department"
                          value={dept}
                          onChange={setDept}
                          options={[
                            "",
                            ...DEPARTMENTS,
                          ]}
                        />
                        <Input
                          label="Staff Number"
                          value={staffNo}
                          onChange={setStaffNo}
                        />

                        <Input
                          label="TSC Number"
                          value={tsc}
                          onChange={setTsc}
                        />

                        <Select
                          label="Contract Type"
                          value={contract}
                          onChange={setContract}
                          options={[
                            "",
                            ...CONTRACT_TYPES,
                          ]}
                        />

                        <Input
                          label="Date Joined"
                          value={joined}
                          onChange={setJoined}
                          type="date"
                        />

                        <Select
                          label="Employment Status"
                          value={stat}
                          onChange={setStat}
                          options={STATUSES}
                        />

                      </div>
                    </section>

                    {/* PAYROLL */}
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <Wallet
                          size={19}
                          className="text-eduke-green"
                        />

                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Payroll & Statutory Information
                          </h3>

                          <p className="text-xs text-gray-500">
                            Used for payroll processing and statutory deductions.
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">

                        <Input
                          label="Basic Monthly Salary (KES)"
                          value={salary}
                          onChange={setSalary}
                          type="number"
                          placeholder="e.g. 45000"
                        />

                        <Input
                          label="KRA PIN"
                          value={kra}
                          onChange={setKra}
                          placeholder="e.g. A001234567X"
                        />

                        <Input
                          label="NHIF Number/ SHA Number"
                          value={nhif}
                          onChange={setNhif}
                        />

                        <Input
                          label="NSSF Number"
                          value={nssf}
                          onChange={setNssf}
                        />

                      </div>
                    </section>

                    {error && (
                      <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                        {error}
                      </div>
                    )}

                    {/* FOOTER */}
                    <div className="flex justify-end gap-3 pt-4 border-t">

                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 bg-eduke-green text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
                      >
                        {saving && (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        )}

                        {saving
                          ? "Saving..."
                          : "Save Changes"}
                      </button>

                    </div>

                  </form>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}


function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>

      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
      />
    </div>
  );
}


function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
      >
        {options.map((option) => (
          <option
            key={option || "empty"}
            value={option}
          >
            {option
              ? option
                  .replaceAll("_", " ")
                  .replace(/\b\w/g, (c) =>
                    c.toUpperCase()
                  )
              : "Select option"}
          </option>
        ))}
      </select>
    </div>
  );
}