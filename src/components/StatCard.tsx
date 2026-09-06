import { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: "default" | "danger";
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${tone === "danger" ? "text-red-600" : "text-gray-900"}`}>
          {value}
        </p>
      </div>
      {Icon && (
        <div className={`rounded-lg p-2 ${tone === "danger" ? "bg-red-50 text-red-600" : "bg-eduke-green/10 text-eduke-green"}`}>
          <Icon size={20} />
        </div>
      )}
    </div>
  );
}
