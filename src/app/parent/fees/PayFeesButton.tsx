"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, LoaderCircle } from "lucide-react";

export default function PayFeesButton({ studentId, amount, label }: { studentId: string; amount: number; label?: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Behaviour unchanged: create the Pesapal order, remember the pending payment for the demo checkout, redirect.
  async function handlePay() {
    setLoading(true);
    const res = await fetch("/api/pesapal/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, amount }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.redirectUrl?.startsWith("/parent/fees/mock-checkout")) {
      sessionStorage.setItem("eduke_pending_payment", JSON.stringify({ studentId, amount }));
    }

    if (data.redirectUrl) {
      window.location.href = data.redirectUrl;
    } else {
      router.push(data.redirectUrl ?? "/parent/fees");
    }
  }

  return (
    <button
      type="button"
      onClick={handlePay}
      disabled={loading}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-pp-green px-5 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-pp-green-deep disabled:opacity-60"
    >
      {loading ? <LoaderCircle size={18} aria-hidden className="animate-spin" /> : <CreditCard size={18} aria-hidden />}
      {label ?? "Pay now via M-Pesa"}
    </button>
  );
}
