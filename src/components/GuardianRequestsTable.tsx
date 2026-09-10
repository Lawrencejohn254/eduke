"use client";

import { useState, Fragment } from "react";
import { Check, X, Pencil, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import StudentLookupInput from "./StudentLookupInput";

type Request = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  relationship: string | null;
  student_full_name_hint: string | null;
  student_admission_number_hint: string | null;
  status: string;
  created_at: string;
};

const RELATIONSHIPS = ["Father", "Mother", "Guardian", "Uncle", "Aunt", "Grandparent", "Other"];

export default function GuardianRequestsTable({
  initialRequests,
  schoolId,
}: {
  initialRequests: Request[];
  schoolId: string;
}) {
  const router = useRouter();

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Draft edits, keyed by request id, so switching rows doesn't lose state.
  const [drafts, setDrafts] = useState<Record<string, Partial<Request>>>({});

  function draftFor(request: Request): Request {
    return { ...request, ...drafts[request.id] };
  }

  function updateDraft(id: string, patch: Partial<Request>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handleAction(id: string, action: "approve" | "reject") {
    setLoadingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/parent/guardian-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to process request.");
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleSaveEdit(id: string) {
    setLoadingId(id);
    setError(null);

    try {
      const draft = drafts[id];
      if (!draft) {
        setEditingId(null);
        return;
      }

      const response = await fetch(`/api/parent/guardian-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          fields: {
            full_name: draft.full_name,
            phone: draft.phone,
            email: draft.email,
            relationship: draft.relationship,
            student_full_name_hint: draft.student_full_name_hint,
            student_admission_number_hint: draft.student_admission_number_hint,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to save changes.");
        return;
      }

      setEditingId(null);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoadingId(null);
    }
  }

  if (initialRequests.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
        <p className="font-medium text-gray-700">No pending parent requests</p>
        <p className="text-sm text-gray-400 mt-1">
          Parents who couldn&apos;t be auto-matched to a student will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      {error && (
        <div className="m-4 bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-left px-5 py-3">Parent</th>
              <th className="text-left px-5 py-3">Relationship</th>
              <th className="text-left px-5 py-3">Child (as entered)</th>
              <th className="text-left px-5 py-3">Applied</th>
              <th className="text-right px-5 py-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {initialRequests.map((request) => {
              const loading = loadingId === request.id;
              const isEditing = editingId === request.id;
              const draft = draftFor(request);

              return (
                <Fragment key={request.id}>
                  <tr className="border-t border-gray-100">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{request.full_name}</p>
                      <p className="text-xs text-gray-500 mt-1">{request.phone}</p>
                      {request.email && (
                        <p className="text-xs text-gray-400">{request.email}</p>
                      )}
                    </td>

                    <td className="px-5 py-4">{request.relationship ?? "-"}</td>

                    <td className="px-5 py-4">
                      <p className="text-gray-900">
                        {request.student_full_name_hint ?? "-"}
                      </p>
                      {request.student_admission_number_hint ? (
                        <p className="text-xs text-gray-400">
                          Adm No: {request.student_admission_number_hint}
                        </p>
                      ) : (
                        <p className="text-xs text-orange-500">
                          No admission number provided — cannot auto-verify
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          disabled={loading}
                          onClick={() => setEditingId(isEditing ? null : request.id)}
                          className="inline-flex items-center gap-1 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                        >
                          <Pencil size={14} />
                          {isEditing ? "Close" : "Edit"}
                        </button>

                        <button
                          disabled={loading}
                          onClick={() => handleAction(request.id, "approve")}
                          className="inline-flex items-center gap-1 bg-eduke-green text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                        >
                          {loading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          Approve
                        </button>

                        <button
                          disabled={loading}
                          onClick={() => handleAction(request.id, "reject")}
                          className="inline-flex items-center gap-1 border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                        >
                          <X size={14} />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>

                  {isEditing && (
                    <tr className="bg-gray-50 border-t border-gray-100">
                      <td colSpan={5} className="px-5 py-5">
                        <div className="grid md:grid-cols-2 gap-4 max-w-3xl">
                          <div>
                            <label className="text-xs font-medium text-gray-600">
                              Parent full name
                            </label>
                            <input
                              type="text"
                              value={draft.full_name}
                              onChange={(e) =>
                                updateDraft(request.id, { full_name: e.target.value })
                              }
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600">
                              Phone number
                            </label>
                            <input
                              type="text"
                              value={draft.phone}
                              onChange={(e) =>
                                updateDraft(request.id, { phone: e.target.value })
                              }
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600">
                              Email (optional)
                            </label>
                            <input
                              type="email"
                              value={draft.email ?? ""}
                              onChange={(e) =>
                                updateDraft(request.id, { email: e.target.value })
                              }
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600">
                              Relationship
                            </label>
                            <select
                              value={draft.relationship ?? "Guardian"}
                              onChange={(e) =>
                                updateDraft(request.id, { relationship: e.target.value })
                              }
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                            >
                              {RELATIONSHIPS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="text-xs font-medium text-gray-600">
                              Student admission number
                            </label>
                            <div className="mt-1">
                              <StudentLookupInput
                                schoolId={schoolId}
                                value={draft.student_admission_number_hint ?? ""}
                                onChange={(admissionNumber) =>
                                  updateDraft(request.id, {
                                    student_admission_number_hint: admissionNumber,
                                  })
                                }
                                onMatchChange={(student) => {
                                  if (student) {
                                    updateDraft(request.id, {
                                      student_full_name_hint: `${student.first_name} ${student.last_name}`,
                                    });
                                  }
                                }}
                              />
                            </div>
                            <p className="mt-1 text-xs text-gray-400">
                              Confirm the matched name above before approving — this is
                              what prevents linking the wrong child.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <button
                            disabled={loading}
                            onClick={() => handleSaveEdit(request.id)}
                            className="inline-flex items-center gap-1 bg-eduke-green text-white px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
                          >
                            {loading && <Loader2 size={14} className="animate-spin" />}
                            Save changes
                          </button>
                          <button
                            disabled={loading}
                            onClick={() => {
                              setEditingId(null);
                              setDrafts((prev) => {
                                const next = { ...prev };
                                delete next[request.id];
                                return next;
                              });
                            }}
                            className="px-4 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}