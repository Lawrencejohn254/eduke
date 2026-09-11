import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for background/system processes only.
// NEVER import this into anything that handles a user request directly —
// it bypasses RLS entirely. Only /api/communications/process should use it.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}