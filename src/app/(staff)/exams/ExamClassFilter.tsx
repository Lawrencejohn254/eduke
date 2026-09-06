"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function ExamClassFilter({ classes }: { classes: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = searchParams.get("class") ?? "";

  return (
    <select
      value={selected}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value) params.set("class", e.target.value);
        else params.delete("class");
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
    >
      <option value="">All classes</option>
      {classes.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}
