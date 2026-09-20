import type { NextRequest } from "next/server";

/**
 * Worker endpoints accept only `Authorization: Bearer <CRON_SECRET>`.
 * If CRON_SECRET is not configured they refuse everything (previously the header "Bearer undefined"
 * would have matched an unset secret).
 */
export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
