// Pesapal integration. Uses the sandbox/live API when PESAPAL_CONSUMER_KEY/SECRET are set,
// otherwise returns a mock checkout URL so the payment flow can be demoed end-to-end.

const isSandbox = (process.env.PESAPAL_ENV ?? "sandbox") === "sandbox";
const BASE_URL = isSandbox
  ? "https://cybqa.pesapal.com/pesapalv3"
  : "https://pay.pesapal.com/v3";

function hasRealKeys() {
  return Boolean(
    process.env.PESAPAL_CONSUMER_KEY &&
      process.env.PESAPAL_CONSUMER_SECRET &&
      process.env.PESAPAL_CONSUMER_KEY !== "your_pesapal_consumer_key"
  );
}

export async function getPesapalToken(): Promise<string> {
  if (!hasRealKeys()) return "mock-token";

  const res = await fetch(`${BASE_URL}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
  });
  const data = await res.json();
  return data.token;
}

export async function submitPesapalOrder(input: {
  amount: number;
  studentName: string;
  studentAdmission: string;
  guardianEmail?: string;
  guardianPhone: string;
  ipnUrl: string;
  callbackUrl: string;
  merchantReference: string;
}): Promise<{ orderTrackingId: string; redirectUrl: string }> {
  if (!hasRealKeys()) {
    // Mock: pretend Pesapal accepted the order and return a fake checkout URL.
    return {
      orderTrackingId: `MOCK-${Date.now()}`,
      redirectUrl: `/parent/fees/mock-checkout?ref=${encodeURIComponent(input.merchantReference)}&amount=${input.amount}`,
    };
  }

  const token = await getPesapalToken();
  const res = await fetch(`${BASE_URL}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id: input.merchantReference,
      currency: "KES",
      amount: input.amount,
      description: `School fee payment for ${input.studentName} (${input.studentAdmission})`,
      callback_url: input.callbackUrl,
      notification_id: input.ipnUrl,
      billing_address: {
        email_address: input.guardianEmail ?? "",
        phone_number: input.guardianPhone,
      },
    }),
  });
  const data = await res.json();
  return { orderTrackingId: data.order_tracking_id, redirectUrl: data.redirect_url };
}

export async function getPesapalTransactionStatus(orderTrackingId: string): Promise<{
  paymentStatus: "COMPLETED" | "FAILED" | "PENDING";
  confirmationCode?: string;
}> {
  if (!hasRealKeys() || orderTrackingId.startsWith("MOCK-")) {
    return { paymentStatus: "COMPLETED", confirmationCode: `MPESA-${Date.now()}` };
  }

  const token = await getPesapalToken();
  const res = await fetch(
    `${BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  const status = data.payment_status_description === "Completed" ? "COMPLETED" : data.payment_status_description === "Failed" ? "FAILED" : "PENDING";
  return { paymentStatus: status, confirmationCode: data.confirmation_code };
}
