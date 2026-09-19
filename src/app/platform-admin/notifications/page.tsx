import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import { sendPlatformNotification } from "./actions";

export const dynamic = "force-dynamic";

interface CampaignRow {
  campaign_id: string;
  subject: string;
  message: string;
  recipient_type: string;
  communication_type: string;
  status_summary: string;
  school_count: number;
  created_at: string;
  scheduled_for: string | null;
  total_count: number;
}

export default async function NotificationsPage() {
  const admin = await requirePlatformAdmin("manage_notifications");
  const supabaseAdmin = createAdminClient();

  const [{ data: schools, error: schoolsError }, { data: campaigns, error: campaignsError }] = await Promise.all([
    supabaseAdmin.from("schools").select("id, name, status").eq("status", "active").order("name"),
    supabaseAdmin.rpc("platform_notification_campaigns", { page_size: 20, page_offset: 0 }),
  ]);

  if (schoolsError) console.error("Failed to load schools:", schoolsError);
  if (campaignsError) console.error("Failed to load notification campaigns:", campaignsError);

  const schoolOptions = schools ?? [];
  const campaignRows = (campaigns as CampaignRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Notifications</h1>
          <p className="text-sm text-gray-400">Send announcements to schools, principals, teachers, or parents.</p>
        </div>
        <Link href="/platform-admin" className="text-xs text-eduke-gold hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-xs text-blue-300">
        This writes into EduKe&apos;s existing in-app notification system (the same table school dashboards already
        read) rather than a separate platform mailer. Delivery/read tracking for staff audiences depends on what the
        school-side app already supports for in-app notifications — parent SMS delivery tracking, where wired up,
        remains owned by the existing communications pipeline.
      </div>

      {/* Compose form */}
      <form action={sendPlatformNotification} className="bg-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-white">Compose Announcement</h2>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Title</label>
          <input
            name="title"
            required
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
            placeholder="e.g. Scheduled maintenance this weekend"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Message</label>
          <textarea
            name="message"
            required
            rows={4}
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
            placeholder="Write the announcement…"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Audience</label>
            <select name="audience" defaultValue="all" className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white">
              <option value="all">All active schools</option>
              <option value="selected">Selected schools</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Send to</label>
            <select name="recipientRole" defaultValue="all" className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white">
              <option value="all">Everyone at the school</option>
              <option value="principals">Principals</option>
              <option value="teachers">Teachers</option>
              <option value="parents">Parents</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Priority</label>
            <select name="priority" defaultValue="normal" className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white">
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Schedule for (optional)</label>
          <input
            type="datetime-local"
            name="scheduledFor"
            className="rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
          />
          <p className="text-xs text-gray-500 mt-1">Leave blank to queue for immediate delivery.</p>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Selected schools (only used when audience is &quot;Selected schools&quot;)
          </label>
          <select
            name="schoolIds"
            multiple
            className="w-full h-40 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
          >
            {schoolOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Ctrl/Cmd-click to select multiple.</p>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-eduke-gold px-5 py-2.5 text-sm font-semibold text-gray-900 hover:opacity-90"
        >
          Send announcement
        </button>
      </form>

      {/* History */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Recent Campaigns</h2>
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          {campaignRows.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No platform announcements sent yet.</div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {campaignRows.map((c) => (
                <div key={c.campaign_id} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium">{c.subject}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(c.created_at).toLocaleString("en-KE", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{c.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {c.recipient_type} · {c.school_count} school{c.school_count === 1 ? "" : "s"} · {c.status_summary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}