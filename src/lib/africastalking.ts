import { toKenyanPhone } from "./format";

const AT_ENDPOINT = "https://api.africastalking.com/version1/messaging";

function hasRealKeys() {
  return Boolean(
    process.env.AFRICASTALKING_API_KEY &&
      process.env.AFRICASTALKING_API_KEY !== "atsk_1826295fb5f938beb9bc57207160a0264e715700dc326af9def42a4691b8664d3bfc0acc"
  );
}

export async function sendSMS(to: string | string[], message: string): Promise<{ success: boolean; simulated: boolean }> {
  const recipients = (Array.isArray(to) ? to : [to]).map(toKenyanPhone).join(",");

  if (!hasRealKeys()) {
    // eslint-disable-next-line no-console
    console.log(`[SMS MOCK] to=${recipients} from=${process.env.AFRICASTALKING_SENDER_ID ?? "EduKe"} message="${message}"`);
    return { success: true, simulated: true };
  }

  const res = await fetch(AT_ENDPOINT, {
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
  });

  return { success: res.ok, simulated: false };
}
