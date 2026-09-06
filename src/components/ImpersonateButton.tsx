"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";

export default function ImpersonateButton({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleImpersonate() {
    if (!confirm(`You're about to log in as ${schoolName}'s principal. This gives you full edit access to their school, exactly as they see it. Continue?`)) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/platform-admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Could not start impersonation.");
      return;
    }

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: data.email,
      token_hash: data.tokenHash,
      type: "magiclink",
    });

    setLoading(false);
    if (verifyError) {
      setError(`Could not establish session: ${verifyError.message}`);
      return;
    }

    sessionStorage.setItem("eduke_impersonating", JSON.stringify({ schoolName, principalName: data.principalName }));
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={handleImpersonate}
        disabled={loading}
        className="flex items-center gap-1.5 bg-eduke-gold text-gray-900 text-sm font-semibold px-3 py-2 rounded-lg hover:brightness-95 transition disabled:opacity-50"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />} Impersonate as Principal
      </button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}