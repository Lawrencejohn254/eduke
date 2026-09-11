import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";

import TermSwitcher from "./TermSwitcher";
import ClassPromotionSettings from "./ClassPromotionSettings";
import AcademicSetup from "./AcademicSetup";
import AcademicYearManager from "@/components/AcademicYearManager";
import EditSchoolInfo from "./EditSchoolInfo";
import StudentEnrollmentSettings from "./StudentEnrollmentSettings";

export default async function SettingsPage() {
  const profile = await getProfileOrRedirect();

  if (
    ![
      "principal",
      "deputy_principal",
      "super_admin",
    ].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  /* =========================
     SCHOOL
  ========================= */

  const { data: school } = await supabase
    .from("schools")
    .select("*")
    .eq("id", profile.school_id)
    .single();

  /* =========================
     CURRENT ACADEMIC YEAR
  ========================= */

  const { data: currentAcademicYear } = await supabase
    .from("academic_years")
    .select("id, year, is_current")
    .eq("school_id", profile.school_id)
    .eq("is_current", true)
    .maybeSingle();

  /* =========================
     TERMS
  ========================= */

  let terms: unknown[] = [];

  if (currentAcademicYear) {
    const { data: termsData } = await supabase
      .from("terms")
      .select(`
        id,
        term_number,
        start_date,
        end_date,
        is_current,
        academic_year:academic_years (
          year
        )
      `)
      .eq(
        "academic_year_id",
        currentAcademicYear.id
      )
      .order("term_number");

    terms = termsData ?? [];
  }

  /* =========================
     CLASSES
  ========================= */

  const { data: classes } = await supabase
    .from("classes")
    .select(`
      id,
      name,
      next_class_id
    `)
    .eq("school_id", profile.school_id)
    .order("name");

  /* =========================
     STREAMS
  ========================= */

  const classIds = (classes ?? []).map(
    (item) => item.id
  );

  let streams: unknown[] = [];

  if (classIds.length > 0) {
    const { data: streamsData } = await supabase
      .from("streams")
      .select(`
        id,
        name,
        capacity,
        class_id
      `)
      .in("class_id", classIds)
      .order("name");

    streams = streamsData ?? [];
  }

  /* =========================
     SUBJECTS
  ========================= */

  const { data: subjects } = await supabase
    .from("subjects")
    .select(`
      id,
      name,
      class_id,
      curriculum_type,
      max_marks,
      is_examinable
    `)
    .eq("school_id", profile.school_id)
    .order("name");

  const canEditSchool = [
    "principal",
    "super_admin",
  ].includes(profile.role);

  return (
    <div className="space-y-6 max-w-2xl">

      {/* =========================
          PAGE HEADER
      ========================= */}

      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Settings
        </h1>

        <p className="text-sm text-gray-500">
          School information and academic calendar.
        </p>
      </div>


      {/* =========================
          SCHOOL INFORMATION
      ========================= */}

      <div className="bg-white rounded-xl border border-gray-100 p-5">

        <div className="flex items-center justify-between gap-4 mb-5">

          <div>
            <p className="text-sm font-semibold text-gray-700">
              School Information
            </p>

            <p className="text-xs text-gray-500 mt-1">
              Basic information about your school.
            </p>
          </div>

          {school && (
            <EditSchoolInfo
              school={{
                id: school.id,
                name: school.name ?? "",
                knec_code: school.knec_code ?? "",
                county: school.county ?? "",
                curriculum: school.curriculum ?? "",
                school_type: school.school_type ?? "",
                is_boarding: school.is_boarding ?? false,
              }}
              canEdit={canEditSchool}
            />
          )}

        </div>


        <div className="grid grid-cols-2 gap-x-6 gap-y-5 text-sm">

          <div>
            <p className="text-gray-500 text-xs mb-1">
              Name
            </p>

            <p className="font-medium text-gray-900">
              {school?.name ?? "-"}
            </p>
          </div>


          <div>
            <p className="text-gray-500 text-xs mb-1">
              KNEC Code
            </p>

            <p className="font-medium text-gray-900">
              {school?.knec_code ?? "-"}
            </p>
          </div>


          <div>
            <p className="text-gray-500 text-xs mb-1">
              County
            </p>

            <p className="font-medium text-gray-900">
              {school?.county ?? "-"}
            </p>
          </div>


          <div>
            <p className="text-gray-500 text-xs mb-1">
              Curriculum
            </p>

            <p className="font-medium text-gray-900">
              {school?.curriculum ?? "-"}
            </p>
          </div>


          <div>
            <p className="text-gray-500 text-xs mb-1">
              Type
            </p>

            <p className="font-medium text-gray-900">
              {school?.school_type ?? "-"}
            </p>
          </div>


          <div>
            <p className="text-gray-500 text-xs mb-1">
              Boarding
            </p>

            <p className="font-medium text-gray-900">
              {school?.is_boarding
                ? "Yes"
                : "No"}
            </p>
          </div>

        </div>

      </div>


      {/* =========================
          STUDENT ENROLLMENT
      ========================= */}

      <StudentEnrollmentSettings
        schoolId={profile.school_id}
        initialEnabled={school?.student_enrollment_enabled ?? false}
        canManage={[
          "principal",
          "deputy_principal",
          "super_admin",
        ].includes(profile.role)}
      />


      {/* =========================
          ACADEMIC YEAR MANAGEMENT
      ========================= */}

      <AcademicYearManager
        schoolId={profile.school_id}
        canManage={[
          "principal",
          "super_admin",
        ].includes(profile.role)}
      />


      {/* =========================
          CURRENT TERM
      ========================= */}

      <div className="bg-white rounded-xl border border-gray-100 p-5">

        <div className="mb-3">

          <p className="text-sm font-semibold text-gray-700">
            Current Term
          </p>

          <p className="text-xs text-gray-500 mt-1">
            {currentAcademicYear
              ? `Academic Year ${currentAcademicYear.year}. Changing the current term synchronizes the active academic context across the school.`
              : "No active academic year configured."}
          </p>

        </div>

        {currentAcademicYear ? (
          <TermSwitcher
            terms={terms as never}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500">
            Create or activate an academic year first.
          </div>
        )}

      </div>


      {/* =========================
          ACADEMIC SETUP
      ========================= */}

      <div className="bg-white rounded-xl border border-gray-100 p-5">

        <p className="text-sm font-semibold text-gray-700 mb-1">
          Academic Setup
        </p>

        <p className="text-xs text-gray-500 mb-3">
          Manage the classes, streams, and subjects
          offered at your school. Teachers and exams
          are assigned against these.
        </p>

        <AcademicSetup
          schoolId={profile.school_id}
          classes={classes ?? []}
          streams={streams as never}
          subjects={subjects ?? []}
        />

      </div>


      {/* =========================
          PROMOTION SETTINGS
      ========================= */}

      <div className="bg-white rounded-xl border border-gray-100 p-5">

        <p className="text-sm font-semibold text-gray-700 mb-1">
          Classes &amp; Promotion
        </p>

        <p className="text-xs text-gray-500 mb-3">
          Set which class each class promotes into,
          and the average-marks threshold a student
          must meet to be auto-promoted.
        </p>

        <ClassPromotionSettings
          classes={classes ?? []}
          promotionThreshold={
            school?.promotion_threshold ?? 50
          }
          schoolId={profile.school_id}
        />

      </div>

    </div>
  );
}