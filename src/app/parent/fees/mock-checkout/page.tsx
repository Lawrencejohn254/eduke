"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Smartphone, CheckCircle2 } from "lucide-react";
import { formatKES } from "@/lib/format";

export default function MockCheckoutPage() {
  const params = useSearchParams();
  const router = useRouter();
  const ref = params.get("ref") ?? "";
  const amount = Number(params.get("amount") ?? 0);
  const studentId = ref.split("-")[1] ? "" : ""; // studentId is embedded server-side already for real flow
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");

  async function handlePay() {
    setStatus("processing");
    // In the mock flow the studentId/amount were already passed through when the order was created;
    // the parent fees page stores them in sessionStorage before redirecting here.
    const raw = sessionStorage.getItem("eduke_pending_payment");
    const pending = raw ? JSON.parse(raw) : null;

    setTimeout(async () => {
      if (pending) {
        await fetch("/api/pesapal/confirm-mock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pending),
        });
      }
      setStatus("done");
      setTimeout(() => router.push("/parent/fees?paid=1"), 1200);
    }, 1800);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-eduke-bg px-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-gray-100 p-6 text-center">
        <div className="mb-3 text-xs font-semibold text-gray-400 tracking-wide">
          PESAPAL SANDBOX (DEMO — no real keys configured)
        </div>
        <Smartphone size={40} className="mx-auto text-eduke-green mb-3" />
        <p className="font-semibold text-gray-900">Complete M-Pesa Payment</p>
        <p className="text-sm text-gray-500 mt-1">Amount: <strong>{formatKES(amount)}</strong></p>
        <p className="text-xs text-gray-400 mt-1">Ref: {ref}</p>

        {status === "idle" && (
          <div className="mt-5 space-y-3 text-left">
            <label className="text-sm font-medium text-gray-700">M-Pesa Phone Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XX XXX XXX"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={handlePay}
              disabled={!phone}
              className="w-full bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50"
            >
              Pay Now
            </button>
          </div>
        )}
        {status === "processing" && (
          <div className="mt-6 flex flex-col items-center gap-2 text-gray-600">
            <Loader2 size={24} className="animate-spin" />
            <p className="text-sm">Waiting for M-Pesa confirmation…</p>
          </div>
        )}
        {status === "done" && (
          <div className="mt-6 flex flex-col items-center gap-2 text-eduke-green">
            <CheckCircle2 size={28} />
            <p className="text-sm font-medium">Payment confirmed!</p>
          </div>
        )}
      </div>
    </div>
  );
}
