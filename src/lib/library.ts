export const LIBRARY_MANAGE_ROLES = [
  "principal",
  "deputy_principal",
  "super_admin",
  "hod",
  "teacher",
  "librarian",
];

export function canManageLibrary(role: string) {
  return LIBRARY_MANAGE_ROLES.includes(role);
}

// A borrowing is overdue purely by comparing today's date to due_date —
// there is no cron job or DB trigger flipping the stored status. This is
// intentional: it can never drift out of sync, and every page (dashboard,
// active/overdue lists, borrowing table) calls this same function instead
// of each re-implementing the date check.
export function isBorrowingOverdue(status: string, dueDate: string | null) {
  if (status !== "Borrowed" || !dueDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today;
}

export function displayBorrowingStatus(status: string, dueDate: string | null) {
  return isBorrowingOverdue(status, dueDate) ? "Overdue" : status;
}