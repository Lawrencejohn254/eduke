// Academic/administrative departments — used for teaching staff, HODs, and
// general admin categorization. This is the pre-existing list.
export const ACADEMIC_DEPARTMENTS = [
  "Administration",
  "Mathematics",
  "Sciences",
  "Languages",
  "Humanities",
  "Finance",
  "Support",
];

// Fine-grained categories for the generic `support_staff` portal role — this
// is what drives which Support Staff Dashboard module a person sees (see
// src/lib/support-staff.ts). Librarian and Bursar are intentionally
// excluded: they carry their own dedicated `profiles.role` and dashboards,
// not the generic support_staff shell.
export const SUPPORT_STAFF_DEPARTMENTS = [
  "Secretary/Receptionist",
  "ICT Support",
  "Nurse/Health Staff",
  "Kitchen/Catering",
  "Storekeeper",
  "Transport Officer",
  "Security",
  "Other Support Staff",
];

export function departmentOptionsForRole(role: string): string[] {
  return role === "support_staff" ? SUPPORT_STAFF_DEPARTMENTS : ACADEMIC_DEPARTMENTS;
}