"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function ExamScopeFilter({ exams }: { exams: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = searchParams.get("exam") ?? "";

  return (
    <select
      value={selected}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value) params.set("exam", e.target.value);
        else params.delete("exam");
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
    >
      <option value="">All exams (cumulative)</option>
      {exams.map((e) => (
        <option key={e.id} value={e.id}>{e.name}</option>
      ))}
    </select>
  );
}
