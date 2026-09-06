"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Child = { id: string; first_name: string; last_name: string; className: string | null };

export default function ChildSelector({ children }: { children: Child[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = searchParams.get("child") ?? children[0]?.id ?? "";

  if (children.length <= 1) return null;

  return (
    <select
      value={selected}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("child", e.target.value);
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
    >
      {children.map((c) => (
        <option key={c.id} value={c.id}>
          {c.first_name} {c.last_name} {c.className ? `(${c.className})` : ""}
        </option>
      ))}
    </select>
  );
}
