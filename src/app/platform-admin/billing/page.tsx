import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import FormDialogButton from "@/components/platform-admin/FormDialogButton";
import { createPlan, assignSubscription } from "./actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

interface BillingRow {
  school_id: string;
  school_name: string;
  school_status: "active" | "suspended" | "pending_setup";
  plan_name: string | null;
  subscription_status: "trial" | "active" | "past_due" | "cancelled" | "none";
  start_date: string | null;
  renewal_date: string | null;
  total_count: number;
}

interface PlanRow {
  id: string;
  name: string;
  description: string | null;
  price_kes: number | null;
  billing_interval: string | null;
}

const STATUS_BADGE: Record<BillingRow["subscription_status"], string> = {
  trial: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  active: "border-green-500/20 bg-green-500/10 text-green-400",
  past_due: "border-orange-500/20 bg-orange-500/10 text-orange-400",
  cancelled: "border-red-500/20 bg-red-500/10 text-red-400",
  none: "border-gray-600 bg-gray-700 text-gray-300",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const admin = await requirePlatformAdmin("view_billing");
  const canManage = admin.has("manage_billing");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const supabaseAdmin = createAdminClient();
  const [{ data: billingRows, error: billingError }, { data: plans, error: plansError }] = await Promise.all([
    supabaseAdmin.rpc("platform_billing_overview", { page_size: PAGE_SIZE, page_offset: (page - 1) * PAGE_SIZE }),
    supabaseAdmin.from("platform_subscription_plans").select("id, name, description, price_kes, billing_interval").order("name"),
  ]);

  if (billingError) console.error("Failed to load billing overview:", billingError);
  if (plansError) console.error("Failed to load subscription plans:", plansError);

  const rows = (billingRows as BillingRow[] | null) ?? [];
  const planRows = (plans as PlanRow[] | null) ?? [];
  const total = rows[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing</h1>
          <p className="text-sm text-gray-400">Subscription status per school.</p>
        </div>
        <Link href="/platform-admin" className="text-xs text-eduke-gold hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-xs text-yellow-300">
        No payment provider is wired into this yet — plans and subscription status are set manually below, and no
        payment records exist until a real billing integration writes them. Nothing here is fabricated.
      </div>

      {/* Plan catalog */}
      <div className="bg-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white">Subscription Plans</h2>
          {canManage && (
            <FormDialogButton
              triggerLabel="+ New plan"
              title="Create a subscription plan"
              action={createPlan}
              confirmLabel="Create plan"
              fields={[
                { name: "name", label: "Plan name", required: true, placeholder: "e.g. Standard" },
                { name: "description", label: "Description", type: "textarea" },
                { name: "price_kes", label: "Price (KES)", placeholder: "Leave blank if undecided" },
                {
                  name: "billing_interval",
                  label: "Billing interval",
                  type: "select",
                  defaultValue: "monthly",
                  options: [
                    { value: "monthly", label: "Monthly" },
                    { value: "annual", label: "Annual" },
                  ],
                },
              ]}
            />
          )}
        </div>
        {planRows.length === 0 ? (
          <p className="text-sm text-gray-400">No plans defined yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {planRows.map((p) => (
              <div key={p.id} className="rounded-lg border border-gray-700 p-3">
                <p className="text-white font-medium text-sm">{p.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {p.price_kes ? `KES ${p.price_kes.toLocaleString()}` : "Price not set"}
                  {p.billing_interval ? ` / ${p.billing_interval}` : ""}
                </p>
                {p.description && <p className="text-xs text-gray-500 mt-1">{p.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-school subscriptions */}
      <div className="bg-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
              <th className="p-3">School</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Status</th>
              <th className="p-3">Start Date</th>
              <th className="p-3">Renewal Date</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.school_id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="p-3 font-medium text-white">{r.school_name}</td>
                <td className="p-3 text-gray-300">{r.plan_name ?? "-"}</td>
                <td className="p-3">
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[r.subscription_status]}`}>
                    {r.subscription_status.replace("_", " ")}
                  </span>
                </td>
                <td className="p-3 text-gray-400 text-xs">
                  {r.start_date ? new Date(r.start_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                </td>
                <td className="p-3 text-gray-400 text-xs">
                  {r.renewal_date ? new Date(r.renewal_date).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                </td>
                <td className="p-3">
                  {canManage && (
                    <FormDialogButton
                      triggerLabel="Edit"
                      title={`Subscription — ${r.school_name}`}
                      action={assignSubscription}
                      hiddenFields={{ schoolId: r.school_id }}
                      confirmLabel="Save"
                      fields={[
                        {
                          name: "planId",
                          label: "Plan",
                          type: "select",
                          options: planRows.map((p) => ({ value: p.id, label: p.name })),
                          placeholder: "No plan",
                        },
                        {
                          name: "status",
                          label: "Status",
                          type: "select",
                          defaultValue: r.subscription_status,
                          required: true,
                          options: [
                            { value: "none", label: "None" },
                            { value: "trial", label: "Trial" },
                            { value: "active", label: "Active" },
                            { value: "past_due", label: "Past due" },
                            { value: "cancelled", label: "Cancelled" },
                          ],
                        },
                        { name: "start_date", label: "Start date", defaultValue: r.start_date ?? "" },
                        { name: "renewal_date", label: "Renewal date", defaultValue: r.renewal_date ?? "" },
                      ]}
                    />
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm text-gray-400">
                  No schools found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Link
            href={`?page=${Math.max(1, page - 1)}`}
            className={`px-3 py-1.5 rounded-lg border border-gray-700 ${page <= 1 ? "pointer-events-none opacity-40" : "text-gray-300 hover:bg-gray-800"}`}
          >
            ← Prev
          </Link>
          <span className="text-gray-400">Page {page} of {totalPages}</span>
          <Link
            href={`?page=${Math.min(totalPages, page + 1)}`}
            className={`px-3 py-1.5 rounded-lg border border-gray-700 ${page >= totalPages ? "pointer-events-none opacity-40" : "text-gray-300 hover:bg-gray-800"}`}
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}