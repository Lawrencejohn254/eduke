"use client";

import { useState } from "react";
import { Menu, X, LogOut, GraduationCap } from "lucide-react";
import { SidebarContent } from "./Sidebar";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function TopBar({
  role,
  name,
  schoolName,
}: {
  role: string;
  name: string;
  schoolName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 bg-eduke-green text-white flex items-center justify-between px-4 py-3">
        <button onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-1.5 font-bold">
          <GraduationCap size={18} className="text-eduke-gold" /> EduKe
        </div>
        <button onClick={handleLogout} aria-label="Log out">
          <LogOut size={20} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-eduke-green flex flex-col">
            <div className="flex justify-end p-3">
              <button onClick={() => setOpen(false)} className="text-white" aria-label="Close menu">
                <X size={22} />
              </button>
            </div>
            <div onClick={() => setOpen(false)} className="flex-1 flex flex-col text-white overflow-y-auto">
              <SidebarContent role={role} />
            </div>
          </div>
        </div>
      )}

      <div className="hidden md:flex items-center justify-end gap-4 px-6 py-3 bg-white border-b border-gray-100">
        <span className="text-sm text-gray-600">
  {name}
  {schoolName && ` (${schoolName})`} ·{" "}
  <span className="capitalize">
    {role.replaceAll("_", " ")}
  </span>
</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} /> Log out
        </button>
      </div>
    </>
  );
}
