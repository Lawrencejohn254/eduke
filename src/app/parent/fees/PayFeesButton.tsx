"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";

export default function PayFeesButton({ studentId, amount }: { studentId: string; amount: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      onClick={handlePay}
      disabled={loading}
      className="mt-4 flex items-center gap-2 bg-eduke-green text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />} Pay Now via M-Pesa
    </button>
  );
}
