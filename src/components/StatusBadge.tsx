const COLOR_MAP: Record<string, string> = {
  Draft: "badge-grey",
  Submitted: "badge-blue",
  Pending: "badge-blue",
  Upcoming: "badge-blue",
  Ongoing: "badge-blue",
  Marking: "badge-blue",
  Approved: "badge-green",
  Confirmed: "badge-green",
  Present: "badge-green",
  "Results Released": "badge-green",
  Returned: "badge-red",
  Failed: "badge-red",
  Absent: "badge-red",
  Overdue: "badge-red",
  Late: "badge-orange",
  Excused: "badge-grey",
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = COLOR_MAP[status] ?? "badge-grey";
  return <span className={`badge ${cls}`}>{status}</span>;
}
