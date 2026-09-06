"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GraduationCap, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { label: "Home", href: "/parent" },
  { label: "Fees (Ada)", href: "/parent/fees" },
  { label: "Results (Matokeo)", href: "/parent/results" },
  { label: "Attendance (Mahudhurio)", href: "/parent/attendance" },
  { label: "Timetable (Ratiba)", href: "/parent/timetable" },
];

export default function ParentTopBar({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-eduke-green text-white">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <div className="flex items-center gap-1.5 font-bold">
          <GraduationCap size={20} className="text-eduke-gold" /> EduKe
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm hidden md:inline">{name}</span>
          <button onClick={handleLogout} className="flex items-center gap-1 text-sm">
            <LogOut size={16} /> <span className="hidden md:inline">Log out</span>
          </button>
        </div>
      </div>
      <nav className="hidden md:flex px-6 gap-1 border-t border-white/10">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2.5 text-sm ${
                active ? "border-b-2 border-eduke-gold font-semibold" : "text-white/80"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
