export const TIMETABLE_COLORS = {
  blue: { bg: "#dbeafe", border: "#93c5fd", text: "#1e3a8a", label: "Blue" },
  orange: { bg: "#ffedd5", border: "#fdba74", text: "#9a3412", label: "Orange" },
  green: { bg: "#dcfce7", border: "#86efac", text: "#14532d", label: "Green" },
  red: { bg: "#fee2e2", border: "#fca5a5", text: "#7f1d1d", label: "Red" },
  purple: { bg: "#ede9fe", border: "#c4b5fd", text: "#4c1d95", label: "Purple" },
  yellow: { bg: "#fef9c3", border: "#fde047", text: "#713f12", label: "Yellow" },
  pink: { bg: "#fce7f3", border: "#f9a8d4", text: "#831843", label: "Pink" },
  teal: { bg: "#ccfbf1", border: "#5eead4", text: "#134e4a", label: "Teal" },
} as const;

export type TimetableColorKey = keyof typeof TIMETABLE_COLORS;

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function colorOf(key: string | null | undefined) {
  return TIMETABLE_COLORS[(key as TimetableColorKey) ?? "blue"] ?? TIMETABLE_COLORS.blue;
}