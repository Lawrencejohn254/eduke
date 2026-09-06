"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function TeacherSelector({ teachers }: { teachers: { id: string; first_name: string; last_name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = searchParams.get("teacher") ?? teachers[0]?.id ?? "";

  return (
    <select
      value={selected}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("teacher", e.target.value);
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
    >
      {teachers.map((t) => (
        <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
      ))}
    </select>
  );
}
