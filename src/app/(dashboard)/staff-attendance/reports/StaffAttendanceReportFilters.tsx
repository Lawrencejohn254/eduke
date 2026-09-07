"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  Filter,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";

type StaffMember = {
  id: string;
  first_name: string;
  last_name: string;
  role: string | null;
};

type Props = {
  startDate: string;
  endDate: string;
  selectedRole: string;
  selectedStaff: string;
  roles: string[];
  staff: StaffMember[];
};

export default function StaffAttendanceReportFilters({
  startDate,
  endDate,
  selectedRole,
  selectedStaff,
  roles,
  staff,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const [role, setRole] = useState(selectedRole);
  const [staffId, setStaffId] =
    useState(selectedStaff);

  /*
   * =========================================================
   * APPLY FILTERS
   * =========================================================
   */

  function handleApplyFilters() {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    if (start) {
      params.set("start", start);
    } else {
      params.delete("start");
    }

    if (end) {
      params.set("end", end);
    } else {
      params.delete("end");
    }

    if (role && role !== "all") {
      params.set("role", role);
    } else {
      params.delete("role");
    }

    if (staffId && staffId !== "all") {
      params.set("staff", staffId);
    } else {
      params.delete("staff");
    }

    router.push(
      `/staff-attendance/reports?${params.toString()}`
    );
  }

  /*
   * =========================================================
   * RESET FILTERS
   * =========================================================
   */

  function handleReset() {
    setRole("all");
    setStaffId("all");

    router.push(
      "/staff-attendance/reports"
    );
  }

  /*
   * =========================================================
   * FILTER STAFF BASED ON SELECTED ROLE
   * =========================================================
   */

  const visibleStaff =
    role === "all"
      ? staff
      : staff.filter(
          (member) =>
            member.role === role
        );

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">

      {/* HEADER */}

      <div className="flex items-center gap-2 mb-5">

        <div className="w-9 h-9 rounded-lg bg-eduke-green/10 flex items-center justify-center">

          <Filter
            size={18}
            className="text-eduke-green"
          />

        </div>

        <div>

          <h2 className="text-sm font-semibold text-gray-900">
            Report Filters
          </h2>

          <p className="text-xs text-gray-500 mt-0.5">
            Select a date range or narrow results by staff.
          </p>

        </div>

      </div>


      {/* FILTER GRID */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* START DATE */}

        <div>

          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-2">

            <CalendarDays size={14} />

            Start Date

          </label>

          <input
            type="date"
            value={start}
            max={end || undefined}
            onChange={(event) =>
              setStart(event.target.value)
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-eduke-green focus:ring-2 focus:ring-eduke-green/10"
          />

        </div>


        {/* END DATE */}

        <div>

          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-2">

            <CalendarDays size={14} />

            End Date

          </label>

          <input
            type="date"
            value={end}
            min={start || undefined}
            onChange={(event) =>
              setEnd(event.target.value)
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-eduke-green focus:ring-2 focus:ring-eduke-green/10"
          />

        </div>


        {/* ROLE */}

        <div>

          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-2">

            <Users size={14} />

            Staff Role

          </label>

          <select
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setStaffId("all");
            }}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-eduke-green focus:ring-2 focus:ring-eduke-green/10"
          >

            <option value="all">
              All Roles
            </option>

            {roles.map((staffRole) => (

              <option
                key={staffRole}
                value={staffRole}
              >
                {staffRole
                  .replace(/_/g, " ")
                  .replace(
                    /\b\w/g,
                    (letter) =>
                      letter.toUpperCase()
                  )}
              </option>

            ))}

          </select>

        </div>


        {/* STAFF */}

        <div>

          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-2">

            <Search size={14} />

            Staff Member

          </label>

          <select
            value={staffId}
            onChange={(event) =>
              setStaffId(event.target.value)
            }
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-eduke-green focus:ring-2 focus:ring-eduke-green/10"
          >

            <option value="all">
              All Staff
            </option>

            {visibleStaff.map((member) => (

              <option
                key={member.id}
                value={member.id}
              >
                {member.first_name}{" "}
                {member.last_name}
              </option>

            ))}

          </select>

        </div>

      </div>


      {/* ACTIONS */}

      <div className="flex flex-col sm:flex-row gap-3 mt-5 pt-5 border-t border-gray-100">

        <button
          type="button"
          onClick={handleApplyFilters}
          className="inline-flex items-center justify-center gap-2 bg-eduke-green text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-eduke-green-dark transition-colors"
        >

          <Filter size={16} />

          Apply Filters

        </button>


        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >

          <RotateCcw size={16} />

          Reset

        </button>

      </div>

    </div>
  );
}