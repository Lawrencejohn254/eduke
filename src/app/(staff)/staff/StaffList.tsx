"use client";

import { useMemo, useState } from "react";
import { Search, X, Users, UserCheck, UserX } from "lucide-react";
import StaffRow from "./StaffRow";

type Staff = {
  id: string;
  staff_number: string | null;
  first_name: string;
  last_name: string;
  role: string | null;
  department: string | null;
  phone: string | null;
  status: string | null;
  gender: string | null;

  // Additional staff details
  email: string | null;
  tsc_number: string | null;
  national_id: string | null;
  kra_pin: string | null;
  nhif_number: string | null;
  nssf_number: string | null;
  contract_type: string | null;
  date_joined: string | null;
  basic_salary: number | null;
};

export default function StaffList({
  staff,
  canEdit,
}: {
  staff: Staff[];
  canEdit: boolean;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Get unique roles
  const roles = useMemo(() => {
    return Array.from(
      new Set(
        staff
          .map((s) => s.role)
          .filter((role): role is string => Boolean(role))
      )
    ).sort();
  }, [staff]);

  // Get unique departments
  const departments = useMemo(() => {
    return Array.from(
      new Set(
        staff
          .map((s) => s.department)
          .filter((department): department is string =>
            Boolean(department)
          )
      )
    ).sort();
  }, [staff]);

  // Apply filters
  const filteredStaff = useMemo(() => {
    const query = search.toLowerCase().trim();

    return staff.filter((s) => {
      const fullName =
        `${s.first_name ?? ""} ${s.last_name ?? ""}`.toLowerCase();

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        s.staff_number?.toLowerCase().includes(query) ||
        s.phone?.toLowerCase().includes(query) ||
        s.role?.toLowerCase().includes(query) ||
        s.department?.toLowerCase().includes(query);

      const matchesRole =
        roleFilter === "all" || s.role === roleFilter;

      const matchesDepartment =
        departmentFilter === "all" ||
        s.department === departmentFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (s.status ?? "Active").toLowerCase() ===
          statusFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesRole &&
        matchesDepartment &&
        matchesStatus
      );
    });
  }, [
    staff,
    search,
    roleFilter,
    departmentFilter,
    statusFilter,
  ]);

  const totalStaff = staff.length;

  const activeStaff = staff.filter(
    (s) => (s.status ?? "Active").toLowerCase() === "active"
  ).length;

  const inactiveStaff = staff.filter(
    (s) => (s.status ?? "").toLowerCase() === "inactive"
  ).length;

  function clearFilters() {
    setSearch("");
    setRoleFilter("all");
    setDepartmentFilter("all");
    setStatusFilter("all");
  }

  const hasActiveFilters =
    search ||
    roleFilter !== "all" ||
    departmentFilter !== "all" ||
    statusFilter !== "all";

  return (
    <div className="space-y-4">

      {/* STAFF STATISTICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Users size={20} />}
          label="Total Staff"
          value={totalStaff}
        />

        <StatCard
          icon={<UserCheck size={20} />}
          label="Active Staff"
          value={activeStaff}
        />

        <StatCard
          icon={<UserX size={20} />}
          label="Inactive Staff"
          value={inactiveStaff}
        />
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row gap-3">

          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff by name, staff number, phone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white"
          >
            <option value="all">All Roles</option>

            {roles.map((role) => (
              <option key={role} value={role}>
                {formatLabel(role)}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white"
          >
            <option value="all">All Departments</option>

            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
            >
              <X size={16} />
              Clear
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Showing{" "}
          <span className="font-semibold text-gray-700">
            {filteredStaff.length}
          </span>{" "}
          of {totalStaff} staff members
        </p>
      </div>

      {/* STAFF TABLE */}
      {filteredStaff.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-12 text-center">
          <Users
            size={36}
            className="mx-auto text-gray-300 mb-3"
          />

          <p className="font-medium text-gray-700">
            No staff members found
          </p>

          <p className="text-sm text-gray-500 mt-1">
            Try adjusting your search or filters.
          </p>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-sm font-medium text-eduke-green hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Staff No.</th>
                <th className="p-3">Name</th>
                <th className="p-3">Role</th>
                <th className="p-3">Department</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>

            <tbody>
              {filteredStaff.map((s) => (
                <StaffRow
                key={s.id}
                id={s.id}
                staffNumber={s.staff_number}
                firstName={s.first_name}
                lastName={s.last_name}
                gender={s.gender}
                role={s.role}
                department={s.department}
                phone={s.phone}
                status={s.status ?? "Active"}

                email={s.email}
                tscNumber={s.tsc_number}
                nationalId={s.national_id}
                kraPin={s.kra_pin}
                nhifNumber={s.nhif_number}
                nssfNumber={s.nssf_number}
                contractType={s.contract_type}
                dateJoined={s.date_joined}
                basicSalary={s.basic_salary}

                canEdit={canEdit}
              />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


/* SMALL STAT CARD */

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-eduke-green/10 text-eduke-green flex items-center justify-center">
        {icon}
      </div>

      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">
          {value}
        </p>
      </div>
    </div>
  );
}


/* FORMAT ROLE LABEL */

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}