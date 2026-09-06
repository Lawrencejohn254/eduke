import { createClient } from "@/lib/supabase/server";

export type AcademicContext = {
  academicYear: {
    id: string;
    year: number;
  };
  term: {
    id: string;
    term_number: string;
    start_date: string | null;
    end_date: string | null;
  };
};

/**
 * Returns the currently active academic year
 * and term for a school.
 *
 * This should be the single source of truth
 * for school-wide academic context.
 */
export async function getCurrentAcademicContext(
  schoolId: string
): Promise<AcademicContext | null> {
  const supabase = await createClient();

  /*
   * Find current academic year.
   */

  const {
    data: academicYear,
    error: academicYearError,
  } = await supabase
    .from("academic_years")
    .select(`
      id,
      year
    `)
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();

  if (academicYearError) {
    console.error(
      "Failed to load current academic year:",
      academicYearError
    );

    return null;
  }

  if (!academicYear) {
    return null;
  }

  /*
   * Find current term belonging
   * to the current academic year.
   */

  const {
    data: term,
    error: termError,
  } = await supabase
    .from("terms")
    .select(`
      id,
      term_number,
      start_date,
      end_date
    `)
    .eq(
      "academic_year_id",
      academicYear.id
    )
    .eq("is_current", true)
    .maybeSingle();

  if (termError) {
    console.error(
      "Failed to load current term:",
      termError
    );

    return null;
  }

  if (!term) {
    return null;
  }

  return {
    academicYear: {
      id: academicYear.id,
      year: academicYear.year,
    },

    term: {
      id: term.id,
      term_number: term.term_number,
      start_date: term.start_date,
      end_date: term.end_date,
    },
  };
}

export async function getCurrentAcademicIds(
  schoolId: string
) {
  const context =
    await getCurrentAcademicContext(schoolId);

  if (!context) {
    return {
      academicYearId: null,
      termId: null,
    };
  }

  return {
    academicYearId:
      context.academicYear.id,

    termId:
      context.term.id,
  };
}