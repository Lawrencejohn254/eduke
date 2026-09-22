import { Inbox } from "lucide-react";

export default function SupportMessagesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Inbox size={20} /> Messages
        </h1>
        <p className="text-sm text-gray-500">Direct messaging between staff isn&apos;t built yet.</p>
      </div>
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
        <p className="text-sm text-gray-500">
          A staff-to-staff messaging inbox is planned as a follow-up module. For now, check{" "}
          <a href="/chat" className="text-eduke-green hover:underline">
            School Chat
          </a>{" "}
          for Internal Communications from your fellow staff and administrators.
        </p>
      </div>
    </div>
  );
}