"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, RotateCcw } from "lucide-react";
import { useState } from "react";

interface Props {
  selectedDate: string;
  selectedStatus: string;
  selectedRole: string;
  search: string;
  roles: string[];
}

export default function StaffAttendanceFilters({
  selectedDate,
  selectedStatus,
  selectedRole,
  search,
  roles,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] =
    useState(search);

  function updateParam(
    key: string,
    value: string
  ) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(
      `/staff-attendance?${params.toString()}`
    );
  }

  function handleSearch(
    event: React.FormEvent
  ) {
    event.preventDefault();

    updateParam(
      "search",
      searchValue.trim()
    );
  }

  function resetFilters() {
    setSearchValue("");

    router.push("/staff-attendance");
  }

  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4">

      <div className="flex flex-col xl:flex-row gap-3">

        {/* SEARCH */}

        <form
          onSubmit={handleSearch}
          className="flex-1 relative"
        >

          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={searchValue}
            onChange={(event) =>
              setSearchValue(
                event.target.value
              )
            }
            placeholder="Search staff..."
            className="w-full h-10 pl-10 pr-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-eduke-green"
          />

        </form>


        {/* DATE */}

        <input
          type="date"
          value={selectedDate}
          onChange={(event) =>
            updateParam(
              "date",
              event.target.value
            )
          }
          className="h-10 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-eduke-green"
        />


        {/* STATUS */}

        <select
          value={selectedStatus}
          onChange={(event) =>
            updateParam(
              "status",
              event.target.value
            )
          }
          className="h-10 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-eduke-green"
        >

          <option value="all">
            All Statuses
          </option>

          <option value="on_duty">
            On Duty
          </option>

          <option value="completed">
            Completed
          </option>

          <option value="late">
            Late
          </option>

          <option value="not_signed_in">
            Not Signed In
          </option>

        </select>


        {/* ROLE */}

        <select
          value={selectedRole}
          onChange={(event) =>
            updateParam(
              "role",
              event.target.value
            )
          }
          className="h-10 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-eduke-green"
        >

          <option value="all">
            All Roles
          </option>

          {roles.map((role) => (
            <option
              key={role}
              value={role}
            >
              {role}
            </option>
          ))}

        </select>


        {/* RESET */}

        <button
          type="button"
          onClick={resetFilters}
          className="h-10 px-3 flex items-center justify-center gap-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >

          <RotateCcw size={16} />

          Reset

        </button>

      </div>

    </div>
  );
}