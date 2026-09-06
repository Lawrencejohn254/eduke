"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Term = {
  id: string;
  academic_year_id: string;
  term_number: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
};

type AcademicYear = {
  id: string;
  school_id: string;
  year: number;
  is_current: boolean;
  terms: Term[];
};

type Props = {
  schoolId: string;
  canManage?: boolean;
};

export default function AcademicYearManager({
  schoolId,
  canManage = false,
}: Props) {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadAcademicYears() {
    setLoading(true);

    const supabase = createClient();

    const { data: yearsData, error: yearsError } =
      await supabase
        .from("academic_years")
        .select("*")
        .eq("school_id", schoolId)
        .order("year", { ascending: false });

    if (yearsError) {
      console.error(yearsError);
      setError(yearsError.message);
      setLoading(false);
      return;
    }

    if (!yearsData || yearsData.length === 0) {
      setYears([]);
      setLoading(false);
      return;
    }

    const yearIds = yearsData.map((year) => year.id);

    const { data: termsData, error: termsError } =
      await supabase
        .from("terms")
        .select("*")
        .in("academic_year_id", yearIds)
        .order("term_number", { ascending: true });

    if (termsError) {
      console.error(termsError);
      setError(termsError.message);
    }

    const termsByYear: Record<string, Term[]> = {};

    for (const term of termsData ?? []) {
      if (!termsByYear[term.academic_year_id]) {
        termsByYear[term.academic_year_id] = [];
      }

      termsByYear[term.academic_year_id].push(term);
    }

    const mergedYears = yearsData.map((year) => ({
      ...year,
      terms: termsByYear[year.id] ?? [],
    }));

    setYears(mergedYears);
    setLoading(false);
  }

  useEffect(() => {
    if (schoolId) {
      loadAcademicYears();
    }
  }, [schoolId]);

  async function createNextAcademicYear() {
    if (!schoolId) return;

    const currentYear = years.find(
      (year) => year.is_current
    );

    if (!currentYear) {
      setError(
        "No current academic year is configured."
      );
      return;
    }

    const nextYearNumber = currentYear.year + 1;

    const exists = years.some(
      (year) => year.year === nextYearNumber
    );

    if (exists) {
      setError(
        `Academic year ${nextYearNumber} already exists.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Create academic year ${nextYearNumber} with Term 1, Term 2 and Term 3?`
    );

    if (!confirmed) return;

    setCreating(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();

      /*
       * Create new academic year.
       *
       * It starts inactive.
       * The principal explicitly activates
       * a term when ready.
       */

      const {
        data: newYear,
        error: yearError,
      } = await supabase
        .from("academic_years")
        .insert({
          school_id: schoolId,
          year: nextYearNumber,
          is_current: false,
        })
        .select()
        .single();

      if (yearError) {
        throw yearError;
      }

      /*
       * Create all three terms.
       */

      const termsPayload = [
        {
          academic_year_id: newYear.id,
          term_number: "Term 1",
          is_current: false,
        },
        {
          academic_year_id: newYear.id,
          term_number: "Term 2",
          is_current: false,
        },
        {
          academic_year_id: newYear.id,
          term_number: "Term 3",
          is_current: false,
        },
      ];

      const { error: termsError } =
        await supabase
          .from("terms")
          .insert(termsPayload);

      if (termsError) {
        /*
         * Rollback academic year
         * if term creation fails.
         */

        await supabase
          .from("academic_years")
          .delete()
          .eq("id", newYear.id);

        throw termsError;
      }

      setMessage(
        `Academic year ${nextYearNumber} created successfully with Term 1, Term 2 and Term 3.`
      );

      await loadAcademicYears();
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ??
          "Unable to create academic year."
      );
    } finally {
      setCreating(false);
    }
  }

  async function setCurrentTerm(
    year: AcademicYear,
    term: Term
  ) {
    if (!schoolId) return;

    const confirmed = window.confirm(
      `Set ${term.term_number} ${year.year} as the current academic term?\n\nThis will deactivate the currently active term across the school.`
    );

    if (!confirmed) return;

    setSwitching(term.id);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();

      /*
       * STEP 1
       * Disable ALL current terms
       * belonging to this school's
       * academic years.
       */

      const schoolYearIds = years.map(
        (item) => item.id
      );

      if (schoolYearIds.length > 0) {
        const { error: deactivateTermsError } =
          await supabase
            .from("terms")
            .update({
              is_current: false,
            })
            .in(
              "academic_year_id",
              schoolYearIds
            );

        if (deactivateTermsError) {
          throw deactivateTermsError;
        }
      }

      /*
       * STEP 2
       * Disable all academic years.
       */

      const { error: deactivateYearsError } =
        await supabase
          .from("academic_years")
          .update({
            is_current: false,
          })
          .eq("school_id", schoolId);

      if (deactivateYearsError) {
        throw deactivateYearsError;
      }

      /*
       * STEP 3
       * Activate selected academic year.
       */

      const { error: activateYearError } =
        await supabase
          .from("academic_years")
          .update({
            is_current: true,
          })
          .eq("id", year.id);

      if (activateYearError) {
        throw activateYearError;
      }

      /*
       * STEP 4
       * Activate selected term.
       */

      const { error: activateTermError } =
        await supabase
          .from("terms")
          .update({
            is_current: true,
          })
          .eq("id", term.id);

      if (activateTermError) {
        throw activateTermError;
      }

      setMessage(
        `${term.term_number} ${year.year} is now the current academic period.`
      );

      await loadAcademicYears();

      /*
       * Refresh server components.
       */

      window.location.reload();
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ??
          "Unable to change the academic term."
      );
    } finally {
      setSwitching(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">

      {/* HEADER */}

      <div className="flex items-start justify-between gap-4 mb-5">

        <div className="flex items-start gap-3">

          <div className="p-2 bg-eduke-green/10 text-eduke-green rounded-lg">
            <CalendarDays size={20} />
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">
              Academic Year & Term
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Control the active academic year and
              term across the entire school system.
            </p>
          </div>

        </div>

        {canManage && (
          <button
            onClick={createNextAcademicYear}
            disabled={creating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-eduke-green text-white text-sm font-medium disabled:opacity-60"
          >
            {creating ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Plus size={16} />
            )}

            {creating
              ? "Creating..."
              : "Create Next Year"}
          </button>
        )}

      </div>


      {/* INFO */}

      <div className="mb-5 bg-blue-50 border border-blue-100 rounded-lg p-4">

        <div className="flex gap-2">

          <AlertTriangle
            size={17}
            className="text-blue-600 shrink-0 mt-0.5"
          />

          <div>

            <p className="text-sm font-medium text-blue-900">
              School-wide academic context
            </p>

            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
              Changing the current term updates the
              academic context used throughout the
              school including exams, fees,
              attendance, lesson planning and
              reporting.
            </p>

          </div>

        </div>

      </div>


      {/* SUCCESS */}

      {message && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 text-sm">

          <CheckCircle2 size={16} />

          {message}

        </div>
      )}


      {/* ERROR */}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}


      {/* LOADING */}

      {loading && (
        <div className="py-10 flex justify-center">

          <Loader2
            size={24}
            className="animate-spin text-eduke-green"
          />

        </div>
      )}


      {/* YEARS */}

      {!loading && (
        <div className="space-y-4">

          {years.length === 0 && (
            <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl">

              <CalendarDays
                size={28}
                className="mx-auto text-gray-300 mb-2"
              />

              <p className="text-sm text-gray-500">
                No academic years configured.
              </p>

            </div>
          )}


          {years.map((year) => (

            <div
              key={year.id}
              className={`rounded-xl border overflow-hidden ${
                year.is_current
                  ? "border-eduke-green"
                  : "border-gray-200"
              }`}
            >

              {/* YEAR HEADER */}

              <div
                className={`flex items-center justify-between px-4 py-3 ${
                  year.is_current
                    ? "bg-eduke-green/5"
                    : "bg-gray-50"
                }`}
              >

                <div className="flex items-center gap-3">

                  <div
                    className={`font-semibold ${
                      year.is_current
                        ? "text-eduke-green"
                        : "text-gray-800"
                    }`}
                  >
                    Academic Year {year.year}
                  </div>

                  {year.is_current && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-eduke-green text-white">
                      Current
                    </span>
                  )}

                </div>

                <ChevronRight
                  size={17}
                  className="text-gray-400"
                />

              </div>


              {/* TERMS */}

              <div className="divide-y divide-gray-100">

                {year.terms.map((term) => (

                  <div
                    key={term.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >

                    <div>

                      <div className="flex items-center gap-2">

                        <span className="text-sm font-medium text-gray-800">
                          {term.term_number}
                        </span>

                        {term.is_current && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            Current
                          </span>
                        )}

                      </div>


                      {(term.start_date ||
                        term.end_date) && (

                        <p className="text-xs text-gray-500 mt-1">

                          {term.start_date ?? "Start date not set"}

                          {" — "}

                          {term.end_date ?? "End date not set"}

                        </p>

                      )}

                    </div>


                    {canManage && !term.is_current && (

                      <button
                        onClick={() =>
                          setCurrentTerm(
                            year,
                            term
                          )
                        }
                        disabled={
                          switching === term.id
                        }
                        className="text-xs font-medium text-eduke-green hover:underline disabled:opacity-50"
                      >

                        {switching === term.id
                          ? "Switching..."
                          : "Set as Current"}

                      </button>

                    )}

                  </div>

                ))}

              </div>

            </div>

          ))}

        </div>
      )}

    </div>
  );
}