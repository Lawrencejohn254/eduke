"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function ExamScopeFilter({ exams }: { exams: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = searchParams.get("exam") ?? exams[0]?.id ?? "";

  return (
    <select
      value={selected}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("exam", e.target.value);
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
    >
      {exams.map((e) => (
        <option key={e.id} value={e.id}>{e.name}</option>
      ))}
    </select>
  );
}
