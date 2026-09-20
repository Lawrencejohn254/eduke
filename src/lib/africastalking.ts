import { toKenyanPhone } from "./format";

const AT_ENDPOINT = "https://api.africastalking.com/version1/messaging";

export type SmsResult = {
  /** true only if the provider accepted every recipient */
  success: boolean;
  /** true when nothing was really sent (local development mock) */
  simulated: boolean;
  /** true when trying again later might work (provider down / rate-limited); false for permanent problems */
  retryable: boolean;
  /** human-readable reason, shown to staff on the recipient row when success is false */
  reason: string | null;
  /** provider's message id (single recipient only) */
  messageId: string | null;
};

type ATRecipient = { statusCode?: number; number?: string; status?: string; messageId?: string };

/** Africa's Talking per-recipient status codes → what actually went wrong, in plain words. */
const AT_STATUS: Record<number, { reason: string; retryable: boolean }> = {
  401: { reason: "Held by the SMS provider's risk check", retryable: false },
  402: { reason: "Sender ID is not registered or approved with Africa's Talking", retryable: false },
  403: { reason: "Invalid phone number", retryable: false },
  404: { reason: "Phone number type is not supported", retryable: false },
  405: { reason: "Insufficient SMS balance in the Africa's Talking account", retryable: false },
  406: { reason: "Recipient has opted out of SMS", retryable: false },
  407: { reason: "Message could not be routed to this number", retryable: false },
  500: { reason: "SMS provider internal error", retryable: true },
  501: { reason: "SMS provider gateway error", retryable: true },
  502: { reason: "Message rejected by the mobile network", retryable: false },
};

/**
 * live       – real credentials, will call Africa's Talking
 * mock       – local development only: logs the message and pretends it was sent
 * unconfigured – production without credentials: fail loudly instead of silently "sending" nothing
 */
function mode(): "live" | "mock" | "unconfigured" {
  const hasKeys = Boolean(process.env.AFRICASTALKING_API_KEY && process.env.AFRICASTALKING_USERNAME);
  const wantLive = process.env.NODE_ENV === "production" || process.env.AFRICASTALKING_LIVE === "true";
  if (!wantLive) return "mock";
  return hasKeys ? "live" : "unconfigured";
}

const fail = (reason: string, retryable = false): SmsResult => ({ success: false, simulated: false, retryable, reason, messageId: null });

export async function sendSMS(to: string | string[], message: string): Promise<SmsResult> {
  const recipients = (Array.isArray(to) ? to : [to]).map(toKenyanPhone).join(",");
  const m = mode();

  if (m === "mock") {
    console.log(`[SMS MOCK] to=${recipients} from=${process.env.AFRICASTALKING_SENDER_ID ?? "EduKe"} message="${message}"`);
    return { success: true, simulated: true, retryable: false, reason: null, messageId: null };
  }
  if (m === "unconfigured") {
    console.error("[SMS] AFRICASTALKING_API_KEY / AFRICASTALKING_USERNAME are not set — nothing was sent");
    return fail("SMS provider is not configured on the server");
  }

  let res: Response;
  try {
    res = await fetch(AT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        apiKey: process.env.AFRICASTALKING_API_KEY!,
      },
      body: new URLSearchParams({
        username: process.env.AFRICASTALKING_USERNAME!,
        to: recipients,
        message,
        from: process.env.AFRICASTALKING_SENDER_ID ?? "EduKe",
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return fail("Could not reach the SMS provider", true);
  }

  if (res.status === 401 || res.status === 403) return fail("SMS provider rejected our credentials (check AFRICASTALKING_API_KEY and AFRICASTALKING_USERNAME)");
  if (!res.ok) return fail(`SMS provider error (HTTP ${res.status})`, res.status >= 500 || res.status === 429);

  // Africa's Talking answers HTTP 201 even when individual numbers are refused — the truth is in the body.
  let body: { SMSMessageData?: { Message?: string; Recipients?: ATRecipient[] } } | null = null;
  try {
    body = await res.json();
  } catch {
    return fail("SMS provider returned an unreadable response");
  }

  const list = body?.SMSMessageData?.Recipients ?? [];
  if (list.length === 0) return fail(body?.SMSMessageData?.Message?.slice(0, 200) || "SMS provider accepted no recipients");

  const bad = list.filter((r) => ![100, 101, 102].includes(Number(r.statusCode)));
  if (bad.length > 0) {
    const first = bad[0];
    const known = AT_STATUS[Number(first.statusCode)];
    return fail(known?.reason ?? `SMS provider refused the message (${first.status ?? first.statusCode})`, known?.retryable ?? false);
  }

  return { success: true, simulated: false, retryable: false, reason: null, messageId: list.length === 1 ? (list[0].messageId ?? null) : null };
}
