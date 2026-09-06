"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, Award, CalendarCheck, CalendarDays } from "lucide-react";

const NAV = [
  { label: "Home", href: "/parent", icon: Home },
  { label: "Fees (Ada)", href: "/parent/fees", icon: Wallet },
  { label: "Results (Matokeo)", href: "/parent/results", icon: Award },
  { label: "Attendance (Mahudhurio)", href: "/parent/attendance", icon: CalendarCheck },
  { label: "Timetable (Ratiba)", href: "/parent/timetable", icon: CalendarDays },
];

export default function ParentBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 flex md:hidden">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] ${
              active ? "text-eduke-green font-semibold" : "text-gray-500"
            }`}
          >
            <item.icon size={20} />
            <span className="text-center leading-tight px-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
