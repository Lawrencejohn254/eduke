import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { sendSMS, type SmsResult } from "@/lib/africastalking";

/**
 * Delivers queued SMS. Used by:
 *   • /api/communications/process  (scheduled worker / safety net — retries, backlog)
 *   • /api/communications/send      (kicks it off right after a message is queued, so parents get
 *                                    the SMS in seconds instead of waiting for the next scheduled run)
 *
 * Runs with the service-role client because it works across the whole queue, not as one user.
 * It only ever sends what is already sitting in notification_recipients — it never takes content
 * from a request.
 */

export type ProcessResult = { claimed: number; sent: number; failed: number; retrying: number; error?: string };

type Deps = { supabase?: SupabaseClient; send?: (to: string, message: string) => Promise<SmsResult> };

type Claimed = { recipient_id: string; notification_id: string; phone: string; message: string };

export async function processSmsQueue(opts: { budgetMs?: number; batchSize?: number } & Deps = {}): Promise<ProcessResult> {
  const { budgetMs = 6000, batchSize = 10 } = opts;
  const supabase = opts.supabase ?? createServiceClient();
  const send = opts.send ?? sendSMS;
  const started = Date.now();
  const out: ProcessResult = { claimed: 0, sent: 0, failed: 0, retrying: 0 };
  const touched = new Set<string>();

  // Optional housekeeping (installed by migration 0003): recovers rows stranded mid-send and expires
  // messages that could not be delivered in 24h. Ignored if the migration hasn't been run yet.
  await supabase.rpc("sms_queue_housekeeping");

  while (Date.now() - started < budgetMs) {
    const { data, error } = await supabase.rpc("claim_pending_sms_recipients", { p_limit: batchSize });
    if (error) {
      out.error = error.message;
      break;
    }
    const batch = (data ?? []) as Claimed[];
    if (batch.length === 0) break;
    out.claimed += batch.length;

    let providerDown = false;
    await Promise.all(
      batch.map(async (item) => {
        touched.add(item.notification_id);
        let result: SmsResult;
        try {
          result = await send(item.phone, item.message);
        } catch {
          result = { success: false, simulated: false, retryable: true, reason: "Could not reach the SMS provider", messageId: null };
        }

        // Temporary problems go back to Pending so the next run retries; permanent ones are Failed with the real reason.
        const status = result.success ? "Sent" : result.retryable ? "Pending" : "Failed";
        if (result.success) out.sent++;
        else if (result.retryable) {
          out.retrying++;
          providerDown = true;
        } else out.failed++;

        await supabase.rpc("update_recipient_delivery_status", {
          p_recipient_id: item.recipient_id,
          p_status: status,
          p_provider_message_id: result.messageId,
          p_failure_reason: result.success ? null : result.reason,
        });
      })
    );

    // Provider is struggling: stop hammering it this run, the scheduler will try again.
    if (providerDown) break;
  }

  for (const id of touched) await supabase.rpc("refresh_notification_status", { p_notification_id: id });
  return out;
}
