import { CalendarDays, CalendarX, GraduationCap, Megaphone, MessageSquare, School, TriangleAlert, Wallet, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "General Announcement": Megaphone,
  "Attendance Alert": CalendarX,
  "Fee Reminder": Wallet,
  "Academic Notice": GraduationCap,
  "Event/Meeting": CalendarDays,
  "Emergency Alert": TriangleAlert,
  "School Closure": School,
  "Custom Message": MessageSquare,
};

export function iconForCommunication(type: string): LucideIcon {
  return ICONS[type] ?? MessageSquare;
}

/** Parent-friendly names for the school's communication types. */
export function labelForCommunication(type: string): string {
  switch (type) {
    case "General Announcement":
      return "Announcement";
    case "Event/Meeting":
      return "Event or meeting";
    case "Custom Message":
      return "Message";
    default:
      return type;
  }
}
