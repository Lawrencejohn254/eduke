"use client";

import { useMemo, useState } from "react";
import { Search, BadgeCheck, ShieldQuestion } from "lucide-react";

type Child = {
  studentId: string;
  name: string;
  admissionNumber: string;
  className: string | null;
  isPrimary: boolean;
  feePayer: boolean;
  canPickup: boolean;
  isVerified: boolean;
};

type Parent = {
  id: string;
  fullName: string;
  phonePrimary: string;
  phoneSecondary: string | null;
  email: string | null;
  relationship: string | null;
  hasAccount: boolean;
  children: Child[];
};

export default function AllParentsTable({ parents }: { parents: Parent[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((p) => {
      const haystack = [
        p.fullName,
        p.phonePrimary,
        p.phoneSecondary,
        p.email,
        ...p.children.map((c) => c.name),
        ...p.children.map((c) => c.admissionNumber),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [parents, query]);

  if (parents.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
        <p className="font-medium text-gray-700">No parents linked yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Approved parent accounts will appear here alongside their children.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="relative max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search parent, phone, or child..."
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-left px-5 py-3">Parent</th>
              <th className="text-left px-5 py-3">Relationship</th>
              <th className="text-left px-5 py-3">Children</th>
              <th className="text-left px-5 py-3">Account</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((parent) => (
              <tr key={parent.id} className="border-t border-gray-100 align-top">
                <td className="px-5 py-4">
                  <p className="font-medium text-gray-900">{parent.fullName}</p>
                  <p className="text-xs text-gray-500 mt-1">{parent.phonePrimary}</p>
                  {parent.phoneSecondary && (
                    <p className="text-xs text-gray-400">{parent.phoneSecondary}</p>
                  )}
                  {parent.email && (
                    <p className="text-xs text-gray-400">{parent.email}</p>
                  )}
                </td>

                <td className="px-5 py-4">{parent.relationship ?? "-"}</td>

                <td className="px-5 py-4">
                  <div className="space-y-2">
                    {parent.children.map((child) => (
                      <div key={child.studentId} className="flex items-start gap-1.5">
                        {child.isVerified ? (
                          <BadgeCheck
                            size={14}
                            className="text-eduke-green mt-0.5 shrink-0"
                          />
                        ) : (
                          <ShieldQuestion
                            size={14}
                            className="text-orange-400 mt-0.5 shrink-0"
                          />
                        )}
                        <div>
                          <p className="text-gray-900">
                            {child.name}
                            {child.isPrimary && (
                              <span className="ml-1.5 text-[10px] uppercase tracking-wide text-eduke-green font-semibold">
                                Primary
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">
                            Adm No: {child.admissionNumber}
                            {child.className ? ` · ${child.className}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </td>

                <td className="px-5 py-4">
                  {parent.hasAccount ? (
                    <span className="inline-flex items-center rounded-full bg-eduke-green/10 text-eduke-green px-2.5 py-1 text-xs font-medium">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-500 px-2.5 py-1 text-xs font-medium">
                      No login yet
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}