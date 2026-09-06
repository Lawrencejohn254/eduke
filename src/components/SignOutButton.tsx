"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SignOutButtonProps {
  variant?: "light" | "dark";
}

export default function SignOutButton({
  variant = "light",
}: SignOutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setLoading(true);

      const supabase = createClient();

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign out error:", error);
        return;
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Unexpected sign out error:", error);
    } finally {
      setLoading(false);
    }
  };

  const styles =
    variant === "dark"
      ? "border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50";

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${styles}`}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          Signing out...
        </>
      ) : (
        <>
          <LogOut size={16} />
          Sign Out
        </>
      )}
    </button>
  );
}