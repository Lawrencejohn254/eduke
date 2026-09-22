/** Every staff role, top of the school down — all of them can use chat. */
export const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super admin",
  principal: "Principal",
  deputy_principal: "Deputy principal",
  hod: "Head of department",
  teacher: "Teacher",
  bursar: "Bursar",
  librarian: "Librarian",
  support_staff: "Support staff",
};

export const roleLabel = (role: string | null | undefined): string => (role ? (ROLE_LABEL[role] ?? role.replace(/_/g, " ")) : "");

/** Badge colours by seniority, purely visual. */
export function roleTone(role: string | null | undefined): string {
  switch (role) {
    case "super_admin":
    case "principal":
    case "deputy_principal":
      return "bg-eduke-green/10 text-eduke-green";
    case "hod":
    case "bursar":
    case "librarian":
      return "bg-amber-50 text-amber-800";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

/** Collapses the stray double spaces found in real names ("Mather  John" → "Mather John"). */
export const cleanName = (first?: string | null, last?: string | null): string =>
  `${first ?? ""} ${last ?? ""}`.replace(/\s+/g, " ").trim();

export const initialsOf = (name: string): string => {
  const parts = name.split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase() || "?";
};
