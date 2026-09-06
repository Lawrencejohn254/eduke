"use client";

import { useEffect, useState } from "react";
import {
  MessageSquareWarning,
  Plus,
  Loader2,
  X,
  Calendar,
  User,
  Settings2,
  Save,
  MessageSquarePlus,
  History,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Author = {
  first_name: string | null;
  last_name: string | null;
  role: string | null;
};

type CaseUpdate = {
  id: string;
  disciplinary_note_id: string;
  update_type: string;
  note: string;
  action_taken: string | null;
  status: string | null;
  created_at: string;
  author?: Author | null;
};

type Note = {
  id: string;
  title: string;
  note: string;
  category: string | null;
  severity: string;
  action_taken: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  status: string;
  visibility?: string;
  created_at: string;
  author?: Author | null;
  updates?: CaseUpdate[];
};

type Props = {
  schoolId: string;
  profileId: string;
  role: string;
  targetType: "student" | "staff";
  targetId: string;
};

const SEVERITIES = [
  "low",
  "medium",
  "high",
  "critical",
];

const STATUSES = [
  "open",
  "under_review",
  "resolved",
  "closed",
];

export default function DisciplinaryNotes({
  schoolId,
  profileId,
  role,
  targetType,
  targetId,
}: Props) {
  const router = useRouter();

  const normalizedRole = (role ?? "")
    .toLowerCase()
    .trim();

  const canAddNotes = [
    "principal",
    "deputy_principal",
    "hod",
    "admin",
    "school_admin",
  ].includes(normalizedRole);

  const canManageNotes = [
    "principal",
    "deputy_principal",
    "admin",
    "school_admin",
  ].includes(normalizedRole);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // ADD ORIGINAL NOTE
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [actionTaken, setActionTaken] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MANAGE CASE
  const [managingNote, setManagingNote] =
    useState<Note | null>(null);

  const [caseUpdate, setCaseUpdate] = useState("");
  const [updateActionTaken, setUpdateActionTaken] =
    useState("");

  const [caseStatus, setCaseStatus] =
    useState("open");

  const [updatingCase, setUpdatingCase] =
    useState(false);

  const [updateError, setUpdateError] =
    useState<string | null>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    setLoading(true);

    const supabase = createClient();

    let query = supabase
      .from("disciplinary_notes")
      .select(`
        *,
        author:profiles!disciplinary_notes_created_by_fkey (
          first_name,
          last_name,
          role
        )
      `)
      .eq("school_id", schoolId)
      .order("created_at", {
        ascending: false,
      });

    if (targetType === "student") {
      query = query.eq("student_id", targetId);
    } else {
      query = query.eq("staff_id", targetId);
    }

    const {
      data: notesData,
      error: notesError,
    } = await query;

    if (notesError) {
      console.error(notesError);
      setLoading(false);
      return;
    }

    if (!notesData || notesData.length === 0) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const noteIds = notesData.map(
      (item) => item.id
    );

    const {
      data: updatesData,
      error: updatesError,
    } = await supabase
      .from("disciplinary_note_updates")
      .select(`
        *,
        author:profiles!disciplinary_note_updates_created_by_fkey (
          first_name,
          last_name,
          role
        )
      `)
      .in("disciplinary_note_id", noteIds)
      .order("created_at", {
        ascending: true,
      });

    if (updatesError) {
      console.error(updatesError);
    }

    const updatesByNote: Record<
      string,
      CaseUpdate[]
    > = {};

    for (const update of updatesData ?? []) {
      if (
        !updatesByNote[
          update.disciplinary_note_id
        ]
      ) {
        updatesByNote[
          update.disciplinary_note_id
        ] = [];
      }

      updatesByNote[
        update.disciplinary_note_id
      ].push(update as CaseUpdate);
    }

    const mergedNotes = notesData.map(
      (item) => ({
        ...item,
        updates:
          updatesByNote[item.id] ?? [],
      })
    );

    setNotes(mergedNotes as Note[]);

    setLoading(false);
  }

  function openManageCase(item: Note) {
    setManagingNote(item);

    setCaseUpdate("");
    setUpdateActionTaken("");

    setCaseStatus(
      item.status ?? "open"
    );

    setUpdateError(null);
  }

  async function handleSave(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!title.trim() || !note.trim()) {
      setError(
        "Title and note details are required."
      );
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();

    const payload = {
      school_id: schoolId,

      student_id:
        targetType === "student"
          ? targetId
          : null,

      staff_id:
        targetType === "staff"
          ? targetId
          : null,

      note_type: "disciplinary",

      title: title.trim(),

      note: note.trim(),

      category:
        category.trim() || null,

      severity,

      action_taken:
        actionTaken.trim() || null,

      follow_up_required:
        followUp,

      follow_up_date:
        followUp && followUpDate
          ? followUpDate
          : null,

      status: "open",

      created_by: profileId,
    };

    const { error } = await supabase
      .from("disciplinary_notes")
      .insert(payload);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setTitle("");
    setNote("");
    setCategory("");
    setSeverity("medium");
    setActionTaken("");
    setFollowUp(false);
    setFollowUpDate("");

    setOpen(false);

    await loadNotes();

    router.refresh();
  }

  async function handleCaseUpdate(
  e: React.FormEvent
) {
  e.preventDefault();

  if (!managingNote) return;

  if (!caseUpdate.trim()) {
    setUpdateError(
      "Please enter details of the case update."
    );
    return;
  }

  setUpdatingCase(true);
  setUpdateError(null);

  try {
    const supabase = createClient();

    // Create immutable timeline entry
    const { error: insertError } = await supabase
      .from("disciplinary_note_updates")
      .insert({
        disciplinary_note_id: managingNote.id,
        school_id: schoolId,

        update_type:
          caseStatus === "closed"
            ? "closure"
            : caseStatus === "resolved"
            ? "resolution"
            : caseStatus === "under_review"
            ? "investigation"
            : "follow_up",

        // REQUIRED DATABASE COLUMN
        note: caseUpdate.trim(),

        action_taken:
          updateActionTaken.trim() || null,

        status: caseStatus,

        created_by: profileId,
      });

    if (insertError) {
      console.error(
        "Case update insert error:",
        insertError
      );

      setUpdateError(insertError.message);
      return;
    }

    // Update overall case status only
    const { error: statusError } = await supabase
      .from("disciplinary_notes")
      .update({
        status: caseStatus,

        // Automatically deactivate follow-up when case is closed
        follow_up_required:
          caseStatus === "closed"
            ? false
            : managingNote.follow_up_required,

        follow_up_date:
          caseStatus === "closed"
            ? null
            : managingNote.follow_up_date,
      })
      .eq("id", managingNote.id)
      .eq("school_id", schoolId);

    if (statusError) {
      console.error(
        "Case status update error:",
        statusError
      );

      setUpdateError(statusError.message);
      return;
    }

    setCaseUpdate("");
    setUpdateActionTaken("");

    setManagingNote(null);

    await loadNotes();

    router.refresh();

  } catch (err) {
    console.error(err);

    setUpdateError(
      "Unable to save the case update."
    );
  } finally {
    setUpdatingCase(false);
  }
}

  function severityStyle(
    severity: string
  ) {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-700";

      case "high":
        return "bg-orange-100 text-orange-700";

      case "medium":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-green-100 text-green-700";
    }
  }

  function statusStyle(
    status: string
  ) {
    switch (status) {
      case "closed":
        return "bg-gray-100 text-gray-700";

      case "resolved":
        return "bg-green-100 text-green-700";

      case "under_review":
        return "bg-blue-100 text-blue-700";

      default:
        return "bg-orange-100 text-orange-700";
    }
  }

  function formatAuthor(
    author?: Author | null
  ) {
    if (!author) return "Unknown user";

    const name = `${author.first_name ?? ""} ${
      author.last_name ?? ""
    }`.trim();

    return name || "Unknown user";
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl">

      {/* HEADER */}

      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">

          <div className="p-2 rounded-lg bg-red-50 text-red-600">
            <MessageSquareWarning size={20} />
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">
              Disciplinary & Additional Notes
            </h2>

            <p className="text-xs text-gray-500 mt-0.5">
              Record incidents, observations and
              investigation follow-ups.
            </p>
          </div>

        </div>

        {canAddNotes && (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 bg-eduke-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-eduke-green-dark"
          >
            <Plus size={16} />
            Add Note
          </button>
        )}
      </div>


      {/* NOTES */}

      <div className="p-5">

        {loading && (
          <div className="py-10 flex justify-center">
            <Loader2
              className="animate-spin text-eduke-green"
              size={24}
            />
          </div>
        )}

        {!loading && notes.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-500">
            No disciplinary or additional notes
            recorded.
          </div>
        )}

        {!loading &&
          notes.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-xl p-5 mb-4"
            >

              {/* NOTE HEADER */}

              <div className="flex justify-between gap-4">

                <div>
                  <div className="flex items-center gap-2 flex-wrap">

                    <h3 className="font-semibold text-gray-900">
                      {item.title}
                    </h3>

                    <span
                      className={`text-xs px-2 py-0.5 rounded-full capitalize ${severityStyle(
                        item.severity
                      )}`}
                    >
                      {item.severity}
                    </span>

                    <span
                      className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusStyle(
                        item.status
                      )}`}
                    >
                      {item.status.replace(
                        "_",
                        " "
                      )}
                    </span>

                  </div>

                  {item.category && (
                    <p className="text-xs text-gray-500 mt-1">
                      Category: {item.category}
                    </p>
                  )}

                </div>

                {canManageNotes && (
                  <button
                    onClick={() =>
                      openManageCase(item)
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-eduke-green hover:underline whitespace-nowrap"
                  >
                    <Settings2 size={14} />
                    Manage Case
                  </button>
                )}

              </div>


              {/* ORIGINAL NOTE */}

              <div className="mt-4">

                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  Original Report
                </p>

                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {item.note}
                </p>

              </div>


              {/* ORIGINAL ACTION */}

              {item.action_taken && (
                <div className="mt-4 bg-gray-50 border border-gray-100 rounded-lg p-3">

                  <p className="text-xs font-semibold text-gray-600">
                    Initial Action Taken
                  </p>

                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                    {item.action_taken}
                  </p>

                </div>
              )}


              {/* CASE TIMELINE */}

              {item.updates &&
                item.updates.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-gray-100">

                    <div className="flex items-center gap-2 mb-4">
                      <History
                        size={16}
                        className="text-eduke-green"
                      />

                      <p className="text-sm font-semibold text-gray-800">
                        Case Updates
                      </p>

                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {item.updates.length}
                      </span>
                    </div>


                    <div className="space-y-3">

                      {item.updates.map(
                        (update) => (
                          <div
                            key={update.id}
                            className="border border-gray-200 rounded-lg p-4 bg-gray-50/50"
                          >

                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {update.note}
                            </p>

                            {update.action_taken && (
                              <div className="mt-3 border-l-2 border-eduke-green pl-3">

                                <p className="text-xs font-semibold text-gray-500">
                                  Action Taken
                                </p>

                                <p className="text-sm text-gray-700 mt-1">
                                  {update.action_taken}
                                </p>

                              </div>
                            )}

                            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">

                              <span className="flex items-center gap-1">
                                <User size={13} />
                                {formatAuthor(
                                  update.author
                                )}
                              </span>

                              {update.author?.role && (
                                <span className="capitalize">
                                  {update.author.role.replace(
                                    "_",
                                    " "
                                  )}
                                </span>
                              )}

                              <span className="flex items-center gap-1">
                                <Calendar size={13} />

                                {new Date(
                                  update.created_at
                                ).toLocaleString()}
                              </span>

                              {update.status && (
                                <span
                                  className={`capitalize px-2 py-0.5 rounded-full ${statusStyle(
                                    update.status
                                  )}`}
                                >
                                  {update.status.replace(
                                    "_",
                                    " "
                                  )}
                                </span>
                              )}

                            </div>

                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}


              {/* ORIGINAL AUTHOR */}

              <div className="mt-5 pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">

                <span className="flex items-center gap-1">
                  <User size={13} />
                  {formatAuthor(item.author)}
                </span>

                {item.author?.role && (
                  <span className="capitalize">
                    {item.author.role.replace(
                      "_",
                      " "
                    )}
                  </span>
                )}

                <span className="flex items-center gap-1">
                  <Calendar size={13} />

                  {new Date(
                    item.created_at
                  ).toLocaleString()}
                </span>

                {item.follow_up_required && (
                  <span className="text-orange-600 font-medium">
                    Follow-up required
                    {item.follow_up_date
                      ? `: ${new Date(
                          item.follow_up_date
                        ).toLocaleDateString()}`
                      : ""}
                  </span>
                )}

              </div>

            </div>
          ))}

      </div>


      {/* ADD ORIGINAL NOTE MODAL */}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-xl rounded-xl max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between p-5 border-b">

              <div>
                <h2 className="font-semibold text-gray-900">
                  Add Disciplinary Note
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  This creates the original case record.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-900"
              >
                <X size={20} />
              </button>

            </div>


            <form
              onSubmit={handleSave}
              className="p-5 space-y-4"
            >

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Title *
                </label>

                <input
                  required
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  placeholder="e.g. Repeated lateness"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                />
              </div>


              <div>
                <label className="text-sm font-medium text-gray-700">
                  Category
                </label>

                <input
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value)
                  }
                  placeholder="Attendance, Behaviour, Performance..."
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                />
              </div>


              <div>
                <label className="text-sm font-medium text-gray-700">
                  Severity
                </label>

                <select
                  value={severity}
                  onChange={(e) =>
                    setSeverity(e.target.value)
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                >
                  {SEVERITIES.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item.charAt(0).toUpperCase() +
                        item.slice(1)}
                    </option>
                  ))}
                </select>
              </div>


              <div>
                <label className="text-sm font-medium text-gray-700">
                  Details *
                </label>

                <textarea
                  required
                  rows={5}
                  value={note}
                  onChange={(e) =>
                    setNote(e.target.value)
                  }
                  placeholder="Describe the incident..."
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none"
                />
              </div>


              <div>
                <label className="text-sm font-medium text-gray-700">
                  Initial Action Taken
                </label>

                <textarea
                  rows={3}
                  value={actionTaken}
                  onChange={(e) =>
                    setActionTaken(e.target.value)
                  }
                  placeholder="Describe any immediate action..."
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none"
                />
              </div>


              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={followUp}
                  onChange={(e) =>
                    setFollowUp(e.target.checked)
                  }
                />

                <span className="text-sm text-gray-700">
                  Follow-up required
                </span>
              </div>


              {followUp && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Follow-up Date
                  </label>

                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) =>
                      setFollowUpDate(e.target.value)
                    }
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                  />
                </div>
              )}


              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
                  {error}
                </div>
              )}


              <div className="flex justify-end gap-3 pt-2">

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-eduke-green text-white rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  {saving && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {saving
                    ? "Saving..."
                    : "Create Case"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}


      {/* MANAGE CASE MODAL */}

      {managingNote && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-2xl rounded-xl max-h-[90vh] overflow-y-auto">

            {/* HEADER */}

            <div className="flex items-center justify-between p-5 border-b border-gray-100">

              <div>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Settings2
                    size={18}
                    className="text-eduke-green"
                  />
                  Manage Case
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  Original report remains unchanged.
                  Add investigation updates below.
                </p>
              </div>

              <button
                onClick={() =>
                  setManagingNote(null)
                }
                className="text-gray-500 hover:text-gray-900"
              >
                <X size={20} />
              </button>

            </div>


            <div className="p-5">

              {/* ORIGINAL REPORT */}

              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">

                <div className="flex items-center gap-2 mb-2">

                  <MessageSquareWarning
                    size={16}
                    className="text-red-600"
                  />

                  <p className="text-sm font-semibold text-gray-800">
                    Original Report
                  </p>

                </div>

                <h3 className="font-medium text-gray-900">
                  {managingNote.title}
                </h3>

                <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                  {managingNote.note}
                </p>

                <p className="text-xs text-gray-400 mt-3">
                  Reported by{" "}
                  {formatAuthor(
                    managingNote.author
                  )}{" "}
                  ·{" "}
                  {new Date(
                    managingNote.created_at
                  ).toLocaleString()}
                </p>

              </div>


              {/* PREVIOUS UPDATES */}

              {managingNote.updates &&
                managingNote.updates.length > 0 && (
                  <div className="mt-5">

                    <div className="flex items-center gap-2 mb-3">

                      <History
                        size={16}
                        className="text-eduke-green"
                      />

                      <h3 className="text-sm font-semibold text-gray-800">
                        Investigation Timeline
                      </h3>

                    </div>


                    <div className="space-y-3">

                      {managingNote.updates.map(
                        (update) => (
                          <div
                            key={update.id}
                            className="border border-gray-200 rounded-lg p-4"
                          >

                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {update.note}
                            </p>

                            {update.action_taken && (
                              <div className="mt-3 bg-gray-50 rounded-lg p-3">

                                <p className="text-xs font-medium text-gray-500">
                                  Action Taken
                                </p>

                                <p className="text-sm text-gray-700 mt-1">
                                  {update.action_taken}
                                </p>

                              </div>
                            )}

                            <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-3">

                              <span>
                                {formatAuthor(
                                  update.author
                                )}
                              </span>

                              <span>
                                {new Date(
                                  update.created_at
                                ).toLocaleString()}
                              </span>

                              {update.status && (
                                <span className="capitalize">
                                  Status:{" "}
                                  {update.status.replace(
                                    "_",
                                    " "
                                  )}
                                </span>
                              )}

                            </div>

                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}


              {/* ADD NEW UPDATE */}

              <form
                onSubmit={handleCaseUpdate}
                className="mt-6 pt-5 border-t border-gray-200 space-y-4"
              >

                <div className="flex items-center gap-2">

                  <MessageSquarePlus
                    size={18}
                    className="text-eduke-green"
                  />

                  <h3 className="font-semibold text-gray-900">
                    Add Case Update
                  </h3>

                </div>


                <p className="text-xs text-gray-500">
                  This creates a permanent timeline
                  entry and does not modify the
                  original report.
                </p>


                <div>

                  <label className="text-sm font-medium text-gray-700">
                    Investigation / Follow-up Details *
                  </label>

                  <textarea
                    required
                    rows={5}
                    value={caseUpdate}
                    onChange={(e) =>
                      setCaseUpdate(e.target.value)
                    }
                    placeholder="Record what happened during the investigation, meetings held, findings or follow-up..."
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none"
                  />

                </div>


                <div>

                  <label className="text-sm font-medium text-gray-700">
                    Action Taken
                  </label>

                  <textarea
                    rows={3}
                    value={updateActionTaken}
                    onChange={(e) =>
                      setUpdateActionTaken(
                        e.target.value
                      )
                    }
                    placeholder="Record disciplinary action, resolution or next steps..."
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none"
                  />

                </div>


                <div>

                  <label className="text-sm font-medium text-gray-700">
                    Case Status
                  </label>

                  <select
                    value={caseStatus}
                    onChange={(e) =>
                      setCaseStatus(e.target.value)
                    }
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                  >
                    {STATUSES.map((item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item
                          .replace("_", " ")
                          .replace(
                            /\b\w/g,
                            (char) =>
                              char.toUpperCase()
                          )}
                      </option>
                    ))}
                  </select>

                </div>


                {caseStatus === "closed" && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2">

                    <CheckCircle2
                      size={17}
                      className="text-green-600 shrink-0 mt-0.5"
                    />

                    <p className="text-xs text-green-700">
                      Closing this case will preserve
                      the original report and all
                      investigation updates. Ensure
                      the update above contains the
                      final resolution details.
                    </p>

                  </div>
                )}


                {updateError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
                    {updateError}
                  </div>
                )}


                <div className="flex justify-end gap-3 pt-3">

                  <button
                    type="button"
                    onClick={() =>
                      setManagingNote(null)
                    }
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={updatingCase}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-eduke-green text-white rounded-lg text-sm font-medium disabled:opacity-60"
                  >
                    {updatingCase ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Save size={16} />
                    )}

                    {updatingCase
                      ? "Saving Update..."
                      : "Save Case Update"}
                  </button>

                </div>

              </form>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}