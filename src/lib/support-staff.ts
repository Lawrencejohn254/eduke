export const TASK_STATUSES = ["Pending", "In Progress", "Completed"] as const;
export const TASK_PRIORITIES = ["Low", "Medium", "High"] as const;

export function isTaskOverdue(status: string, dueDate: string | null) {
  if (status === "Completed" || !dueDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today;
}

export type NotificationItem = { key: string; text: string; at: string };

export function buildNotifications(
  notices: { id: string; title: string; created_at: string }[],
  overdueTasks: { id: string; title: string; due_date: string | null; created_at: string }[]
): NotificationItem[] {
  return [
    ...notices.map((n) => ({ key: `notice-${n.id}`, text: `New notice: ${n.title}`, at: n.created_at })),
    ...overdueTasks.map((t) => ({ key: `overdue-${t.id}`, text: `Overdue: ${t.title}`, at: t.due_date ?? t.created_at })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
}

// Librarian and Bursar already have their own dedicated portal roles and
// dashboards (built in earlier phases) — they never reach this dashboard.
// This map only covers the sub-categories that share the generic
// `profiles.role = 'support_staff'` portal role, driven by `staff.department`.
export const SUPPORT_DEPARTMENT_MODULES: Record<string, { label: string; description: string }> = {
  "Secretary/Receptionist": { label: "Administration", description: "Front-office and administrative support tools." },
  "ICT Support": { label: "ICT Management", description: "Device, network and system support tools." },
  "Nurse/Health Staff": { label: "Health", description: "Student and staff health records and incident logs." },
  Storekeeper: { label: "Inventory", description: "School stores and supplies management." },
  "Transport Officer": { label: "Transport", description: "Vehicle, route and driver management." },
  Security: { label: "Security", description: "Gate logs, visitor records and incident reports." },
  "Other Support Staff": { label: "General Support", description: "General support-staff tools." },
};

export function moduleForDepartment(department: string | null) {
  if (department && SUPPORT_DEPARTMENT_MODULES[department]) {
    return SUPPORT_DEPARTMENT_MODULES[department];
  }
  return { label: "General Support", description: "No specific module is set up for your department yet." };
}