"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function ImpersonationBanner() {
  const [info, setInfo] = useState<{ schoolName: string; principalName: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const raw = sessionStorage.getItem("eduke_impersonating");
    if (raw) {
      try {
        setInfo(JSON.parse(raw));
      } catch {
        // ignore malformed value
      }
    }
  }, []);

  if (!info) return null;

  async function exitImpersonation() {
    sessionStorage.removeItem("eduke_impersonating");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="bg-eduke-gold text-gray-900 text-xs font-medium px-4 py-2 flex items-center justify-between flex-wrap gap-2">
      <span>🔒 Platform Admin — viewing as {info.principalName} ({info.schoolName})</span>
      <button onClick={exitImpersonation} className="flex items-center gap-1 hover:underline font-semibold shrink-0">
        <LogOut size={13} /> Exit &amp; log back in as admin
      </button>
    </div>
  );
}