"use client";

import { useState } from "react";
import { Pencil, X, Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type School = {
  id: string;
  name: string;
  knec_code: string;
  county: string;
  curriculum: string;
  school_type: string;
  is_boarding: boolean;
};

export default function EditSchoolInfo({
  school,
  canEdit,
}: {
  school: School;
  canEdit: boolean;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Existing school information
  const [name, setName] = useState(school.name ?? "");
  const [knecCode, setKnecCode] = useState(
    school.knec_code ?? ""
  );
  const [county, setCounty] = useState(
    school.county ?? ""
  );
  const [curriculum, setCurriculum] = useState(
    school.curriculum ?? ""
  );
  const [schoolType, setSchoolType] = useState(
    school.school_type ?? ""
  );
  const [isBoarding, setIsBoarding] = useState(
    school.is_boarding ?? false
  );

  function handleClose() {
    setOpen(false);
    setError(null);

    // Reset values back to database values when closing
    setName(school.name ?? "");
    setKnecCode(school.knec_code ?? "");
    setCounty(school.county ?? "");
    setCurriculum(school.curriculum ?? "");
    setSchoolType(school.school_type ?? "");
    setIsBoarding(school.is_boarding ?? false);
  }

  async function handleSave(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("schools")
        .update({
          name: name.trim(),
          knec_code: knecCode.trim() || null,
          county: county.trim() || null,
          curriculum: curriculum || null,
          school_type: schoolType || null,
          is_boarding: isBoarding,
        })
        .eq("id", school.id);

      if (error) {
        setError(error.message);
        return;
      }

      setOpen(false);
      router.refresh();

    } catch (err) {
      console.error(err);

      setError(
        "Unable to update school information."
      );
    } finally {
      setSaving(false);
    }
  }

  // Do not show edit button for unauthorized users
  if (!canEdit) return null;

  return (
    <>
      {/* EDIT BUTTON */}

      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-eduke-green border border-eduke-green/30 rounded-lg hover:bg-eduke-green/5 transition-colors"
      >
        <Pencil size={15} />
        Edit
      </button>


      {/* MODAL */}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">

            {/* HEADER */}

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">

              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Edit School Information
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  Update your school's official information.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="text-gray-500 hover:text-gray-900"
                aria-label="Close"
              >
                <X size={20} />
              </button>

            </div>


            {/* FORM */}

            <form
              onSubmit={handleSave}
              className="p-6 space-y-5"
            >

              {/* SCHOOL NAME */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  School Name
                </label>

                <input
                  required
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Enter school name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                />
              </div>


              {/* KNEC CODE */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  KNEC Code
                </label>

                <input
                  value={knecCode}
                  onChange={(e) =>
                    setKnecCode(e.target.value)
                  }
                  placeholder="Enter KNEC code"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                />
              </div>


              {/* COUNTY */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  County
                </label>

                <input
                  value={county}
                  onChange={(e) =>
                    setCounty(e.target.value)
                  }
                  placeholder="e.g. Nairobi"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
                />
              </div>


              {/* CURRICULUM + TYPE */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Curriculum
                  </label>

                  <select
                    value={curriculum}
                    onChange={(e) =>
                      setCurriculum(e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-eduke-green"
                  >
                    <option value="">
                      Select curriculum
                    </option>

                    <option value="CBC">
                      CBC
                    </option>

                    <option value="8-4-4">
                      8-4-4
                    </option>

                    <option value="Both">
                      Both
                    </option>

                  </select>
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    School Type
                  </label>

                  <select
                    value={schoolType}
                    onChange={(e) =>
                      setSchoolType(e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-eduke-green"
                  >
                    <option value="">
                      Select type
                    </option>

                    <option value="Public">
                      Public
                    </option>

                    <option value="Private">
                      Private
                    </option>

                  </select>
                </div>

              </div>


              {/* BOARDING */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Boarding
                </label>

                <select
                  value={isBoarding ? "true" : "false"}
                  onChange={(e) =>
                    setIsBoarding(
                      e.target.value === "true"
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-eduke-green"
                >
                  <option value="false">
                    No
                  </option>

                  <option value="true">
                    Yes
                  </option>

                </select>
              </div>


              {/* ERROR */}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}


              {/* ACTIONS */}

              <div className="flex gap-3 pt-4 border-t border-gray-100">

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={saving}
                  className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-eduke-green py-2.5 text-sm font-medium text-white hover:bg-eduke-green-dark disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}
    </>
  );
}