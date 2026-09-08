"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/Loaders";
import StudentRow from "./StudentRow";

type Student = {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  gender: string;
  status: string;
  stream_id: string | null;
  date_of_birth: string | null;
  kcpe_index: string | null;
  nemis_id: string | null;
  previous_school: string | null;
  class: { name: string } | null;
  stream: { name: string } | null;
};

export default function StudentsTable({
  students,
  streams,
  canEdit,
}: {
  students: Student[];
  streams: unknown;
  canEdit: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;

    return students.filter((s) => {
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      return (
        fullName.includes(q) ||
        s.admission_number?.toLowerCase().includes(q) ||
        s.class?.name?.toLowerCase().includes(q) ||
        s.stream?.name?.toLowerCase().includes(q)
      );
    });
  }, [students, query]);

  return (
    <>
      <div className="relative w-full max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, admission no. or class..."
          className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching students"
          description={`No students match "${query}".`}
        />
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Admission No.</th>
                <th className="p-3">Name</th>
                <th className="p-3">Gender</th>
                <th className="p-3">Class</th>
                <th className="p-3">Stream</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <StudentRow
                  key={s.id}
                  id={s.id}
                  admissionNumber={s.admission_number}
                  firstName={s.first_name}
                  lastName={s.last_name}
                  gender={s.gender}
                  status={s.status}
                  streamId={s.stream_id}
                  dateOfBirth={s.date_of_birth}
                  kcpeIndex={s.kcpe_index}
                  nemisId={s.nemis_id}
                  previousSchool={s.previous_school}
                  className={s.class?.name ?? "-"}
                  streamName={s.stream?.name ?? "-"}
                  streams={streams as never}
                  canEdit={canEdit}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}