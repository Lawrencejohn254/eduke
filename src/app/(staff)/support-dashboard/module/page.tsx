import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { moduleForDepartment } from "@/lib/support-staff";
import DepartmentLogClient from "./DepartmentLogClient";
import VisitorsModule from "./VisitorsModule";
import HealthModule from "./HealthModule";
import KitchenModule from "./KitchenModule";
import StoreModule from "./StoreModule";
import TransportModule from "./TransportModule";
import SecurityModule from "./SecurityModule";

export default async function SupportModulePage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: staffRecord } = await supabase
    .from("staff")
    .select("department")
    .eq("profile_id", profile.id)
    .eq("school_id", profile.school_id)
    .eq("status", "Active")
    .maybeSingle();

  const department = staffRecord?.department ?? null;
  const moduleInfo = moduleForDepartment(department);

  if (!department) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <LifeBuoy size={20} /> {moduleInfo.label}
          </h1>
          <p className="text-sm text-gray-500">{moduleInfo.description}</p>
        </div>
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">
            No department is set on your staff record yet. Ask your principal to assign one from Staff → your profile.
          </p>
        </div>
      </div>
    );
  }

  if (department === "ICT Support") {
    redirect("/it-support");
  }

  if (department === "Secretary/Receptionist") {
    const [{ data: visitors, error }, { data: staffList }] = await Promise.all([
      supabase
        .from("visitors")
        .select("id, full_name, phone, purpose, host_name, host_staff_id, badge_number, check_in_at, check_out_at")
        .eq("school_id", profile.school_id)
        .order("check_in_at", { ascending: false })
        .limit(100),
      supabase.from("staff").select("id, first_name, last_name").eq("school_id", profile.school_id).eq("status", "Active").order("first_name"),
    ]);

    return (
      <ModuleShell label={moduleInfo.label} description={moduleInfo.description} error={error?.message}>
        <VisitorsModule schoolId={profile.school_id} profileId={profile.id} visitors={visitors ?? []} staffList={staffList ?? []} />
      </ModuleShell>
    );
  }

  if (department === "Nurse/Health Staff") {
    const [{ data: visits, error }, { data: students }] = await Promise.all([
      supabase
        .from("health_visits")
        .select(
          "id, visited_at, symptoms, treatment_given, medication_given, outcome, parent_notified, notes, student:students(first_name, last_name, admission_number, class:classes(name))"
        )
        .eq("school_id", profile.school_id)
        .order("visited_at", { ascending: false })
        .limit(100),
      supabase
        .from("students")
        .select("id, first_name, last_name, admission_number, class:classes(name)")
        .eq("school_id", profile.school_id)
        .eq("status", "Active")
        .order("first_name"),
    ]);

    return (
      <ModuleShell label={moduleInfo.label} description={moduleInfo.description} error={error?.message}>
        <HealthModule schoolId={profile.school_id} profileId={profile.id} visits={(visits ?? []) as never} students={(students ?? []) as never} />
      </ModuleShell>
    );
  }

  if (department === "Kitchen/Catering") {
    const { data: meals, error } = await supabase
      .from("meal_logs")
      .select("id, meal_date, meal_type, menu_item, students_served, notes, created_at")
      .eq("school_id", profile.school_id)
      .order("meal_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    return (
      <ModuleShell label={moduleInfo.label} description={moduleInfo.description} error={error?.message}>
        <KitchenModule schoolId={profile.school_id} profileId={profile.id} meals={meals ?? []} />
      </ModuleShell>
    );
  }

  if (department === "Storekeeper") {
    const [{ data: items, error }, { data: movements }] = await Promise.all([
      supabase
        .from("store_items")
        .select("id, name, category, unit, quantity_in_stock, reorder_level")
        .eq("school_id", profile.school_id)
        .order("name"),
      supabase
        .from("store_movements")
        .select("id, movement_type, quantity, reason, issued_to, created_at, item:store_items(name, unit)")
        .eq("school_id", profile.school_id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    return (
      <ModuleShell label={moduleInfo.label} description={moduleInfo.description} error={error?.message}>
        <StoreModule schoolId={profile.school_id} profileId={profile.id} items={items ?? []} movements={(movements ?? []) as never} />
      </ModuleShell>
    );
  }

  if (department === "Transport Officer") {
    const [{ data: vehicles, error }, { data: trips }] = await Promise.all([
      supabase.from("vehicles").select("id, registration_number, vehicle_type, capacity, driver_name, status").eq("school_id", profile.school_id).order("registration_number"),
      supabase
        .from("vehicle_trips")
        .select("id, trip_date, purpose, driver_name, departure_time, return_time, notes, vehicle:vehicles(registration_number, vehicle_type)")
        .eq("school_id", profile.school_id)
        .order("trip_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    return (
      <ModuleShell label={moduleInfo.label} description={moduleInfo.description} error={error?.message}>
        <TransportModule schoolId={profile.school_id} profileId={profile.id} vehicles={vehicles ?? []} trips={(trips ?? []) as never} />
      </ModuleShell>
    );
  }

  if (department === "Security") {
    const { data: logs, error } = await supabase
      .from("security_logs")
      .select("id, log_type, description, location, severity, created_at")
      .eq("school_id", profile.school_id)
      .order("created_at", { ascending: false })
      .limit(100);

    return (
      <ModuleShell label={moduleInfo.label} description={moduleInfo.description} error={error?.message}>
        <SecurityModule schoolId={profile.school_id} profileId={profile.id} logs={logs ?? []} />
      </ModuleShell>
    );
  }

  const { data: entries, error } = await supabase
    .from("department_logs")
    .select("id, entry, created_at, logged_by, profile:profiles!department_logs_logged_by_fkey(first_name, last_name)")
    .eq("school_id", profile.school_id)
    .eq("department", department)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <ModuleShell label={moduleInfo.label} description={moduleInfo.description} error={error?.message}>
      <DepartmentLogClient department={department} schoolId={profile.school_id} profileId={profile.id} entries={(entries ?? []) as never} />
    </ModuleShell>
  );
}

function ModuleShell({
  label,
  description,
  error,
  children,
}: {
  label: string;
  description: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <LifeBuoy size={20} /> {label}
        </h1>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <p className="font-semibold">Could not load this module.</p>
          <p className="mt-1 font-mono text-xs">{error}</p>
        </div>
      )}
      {children}
    </div>
  );
}