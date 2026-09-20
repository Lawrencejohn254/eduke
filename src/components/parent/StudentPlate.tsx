import type { ChildOption } from "@/lib/get-children";
import ChildSwitcher, { type SwitcherChild } from "./ChildSwitcher";
import { Avatar } from "./ui";

export function toSwitcherChildren(children: ChildOption[], schoolName: string): SwitcherChild[] {
  return children.map((c) => ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    subtitle: [c.className, c.streamName].filter(Boolean).join(" ") + (schoolName ? ` • ${schoolName}` : ""),
  }));
}

export function childSubtitle(child: ChildOption, schoolName: string): string {
  return [[child.className, child.streamName].filter(Boolean).join(" "), schoolName].filter(Boolean).join(" • ");
}

/**
 * The anchor of every parent page: it always says whose information you are looking at.
 * "hero" is the bold version used once on the dashboard; "bar" is the slim version everywhere else.
 */
export default function StudentPlate({
  child,
  allChildren,
  schoolName,
  variant = "bar",
  meta = [],
}: {
  child: ChildOption;
  allChildren: ChildOption[];
  schoolName: string;
  variant?: "hero" | "bar";
  meta?: string[];
}) {
  const switcherKids = toSwitcherChildren(allChildren, schoolName);
  const multiple = allChildren.length > 1;

  if (variant === "hero") {
    return (
      <section aria-label="Selected child" className="rounded-lg bg-pp-green-deep px-4 py-5 text-white sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar first={child.first_name} last={child.last_name} size={60} tone="gold" />
            <div className="min-w-0">
              <p className="font-display truncate text-[1.5rem] leading-tight font-semibold sm:text-[1.75rem]">
                {child.first_name} {child.last_name}
              </p>
              <p className="mt-0.5 truncate text-[0.9375rem] text-white/80">{childSubtitle(child, schoolName)}</p>
            </div>
          </div>
          {multiple ? <ChildSwitcher options={switcherKids} activeId={child.id} variant="button-dark" /> : null}
        </div>
        {meta.length ? (
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-white/15 pt-3.5 text-[0.8125rem] text-white/80">
            {meta.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  }

  if (multiple) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Selected child">
        <ChildSwitcher options={switcherKids} activeId={child.id} variant="identity" />
      </div>
    );
  }

  return (
    <div aria-label="Selected child" className="flex min-h-14 items-center gap-3 rounded-lg border border-pp-rule bg-pp-surface px-3.5 py-2 sm:w-fit sm:min-w-72">
      <Avatar first={child.first_name} last={child.last_name} size={36} />
      <div className="min-w-0">
        <p className="truncate text-[0.9375rem] font-semibold text-pp-ink">
          {child.first_name} {child.last_name}
        </p>
        <p className="truncate text-[0.8125rem] text-pp-muted">{childSubtitle(child, schoolName)}</p>
      </div>
    </div>
  );
}
