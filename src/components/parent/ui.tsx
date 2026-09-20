import Link from "next/link";
import { ChevronRight, CircleCheck, CircleX, Clock, Minus, type LucideIcon } from "lucide-react";
import { gradeMeaning, gradeTone, type GradeTone } from "@/lib/parent/results";

/* ─────────────────────────── layout primitives ─────────────────────────── */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="font-display text-[1.75rem] leading-tight font-semibold text-pp-ink sm:text-[2rem]">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-[0.9375rem] leading-relaxed text-pp-muted">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  bodyClassName = "",
  className = "",
  id,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: { href: string; label: string } | React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
  className?: string;
  id?: string;
}) {
  const actionNode =
    action && typeof action === "object" && "href" in (action as object) && "label" in (action as object) ? (
      <Link
        href={(action as { href: string }).href}
        className="inline-flex items-center gap-0.5 whitespace-nowrap text-[0.8125rem] font-medium text-pp-green hover:underline"
      >
        {(action as { label: string }).label}
        <ChevronRight size={14} aria-hidden />
      </Link>
    ) : (
      (action as React.ReactNode)
    );

  return (
    <section id={id} className={`scroll-mt-20 rounded-lg border border-pp-rule bg-pp-surface ${className}`}>
      {title ? (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-pp-rule px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-[0.9375rem] font-semibold text-pp-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-[0.8125rem] text-pp-muted">{description}</p> : null}
          </div>
          {actionNode}
        </header>
      ) : null}
      <div className={bodyClassName || "p-4 sm:p-5"}>{children}</div>
    </section>
  );
}

/* ─────────────────────────── ledger strip ─────────────────────────── */

const LEDGER_COLS = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} as const;

/**
 * A single ruled strip of headline figures — closer to a bank statement header than a row of cards.
 * The 1px gaps over a rule-coloured background draw every divider, at any column count.
 */
export function Ledger({ cols = 3, children }: { cols?: 2 | 3 | 4; children: React.ReactNode }) {
  return (
    <ul className={`grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-pp-rule bg-pp-rule ${LEDGER_COLS[cols]}`}>{children}</ul>
  );
}

export function LedgerItem({
  label,
  value,
  note,
  icon: Icon,
  href,
  tone = "default",
  aside,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  icon?: LucideIcon;
  href?: string;
  tone?: "default" | "good" | "warn" | "danger";
  aside?: React.ReactNode;
}) {
  const valueColor = tone === "danger" ? "text-pp-danger" : tone === "warn" ? "text-pp-warn" : tone === "good" ? "text-pp-green" : "text-pp-ink";

  const inner = (
    <div className="flex h-full flex-col justify-between gap-2.5 px-4 py-3.5 sm:gap-3 sm:px-5 sm:py-5">
      <div className="flex items-center gap-2 text-[0.8125rem] font-medium text-pp-muted">
        {Icon ? <Icon size={16} aria-hidden className="shrink-0 text-pp-faint" /> : null}
        <span className="truncate">{label}</span>
        {href ? <ChevronRight size={14} aria-hidden className="ml-auto shrink-0 text-pp-faint" /> : null}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={`pp-num font-display text-[1.75rem] leading-none font-semibold sm:text-[2rem] ${valueColor}`}>{value}</span>
          {aside}
        </div>
        {note ? <p className="mt-2 text-[0.8125rem] leading-snug text-pp-muted">{note}</p> : null}
      </div>
    </div>
  );

  return href ? (
    <li className="min-w-0 bg-pp-surface">
      <Link href={href} className="block h-full transition-colors hover:bg-pp-sunken focus-visible:bg-pp-sunken">
        {inner}
      </Link>
    </li>
  ) : (
    <li className="min-w-0 bg-pp-surface">{inner}</li>
  );
}

/* ─────────────────────────── badges & pills ─────────────────────────── */

const GRADE_TONE_CLASS: Record<GradeTone, string> = {
  top: "bg-pp-green-tint text-pp-green",
  good: "bg-pp-info-tint text-pp-info",
  fair: "bg-pp-warn-tint text-pp-warn",
  low: "bg-pp-danger-tint text-pp-danger",
  none: "bg-pp-sunken text-pp-muted",
};

export function GradeBadge({ grade, size = "md" }: { grade: string | null | undefined; size?: "sm" | "md" | "lg" }) {
  const tone = gradeTone(grade);
  const meaning = gradeMeaning(grade);
  const sizing = size === "lg" ? "min-w-11 px-3 py-1 text-[0.9375rem]" : size === "sm" ? "min-w-8 px-1.5 py-0.5 text-[0.75rem]" : "min-w-9 px-2 py-0.5 text-[0.8125rem]";
  return (
    <span
      title={meaning || undefined}
      className={`pp-num inline-flex items-center justify-center rounded-md font-semibold ${sizing} ${GRADE_TONE_CLASS[tone]}`}
    >
      <span className="sr-only">Grade </span>
      {grade || "–"}
      {meaning ? <span className="sr-only">, {meaning}</span> : null}
    </span>
  );
}

type PillTone = "good" | "warn" | "danger" | "info" | "neutral";

const PILL_TONE: Record<PillTone, string> = {
  good: "bg-pp-green-tint text-pp-green",
  warn: "bg-pp-warn-tint text-pp-warn",
  danger: "bg-pp-danger-tint text-pp-danger",
  info: "bg-pp-info-tint text-pp-info",
  neutral: "bg-pp-sunken text-pp-muted",
};

const PILL_ICON: Record<PillTone, LucideIcon> = {
  good: CircleCheck,
  warn: Clock,
  danger: CircleX,
  info: Clock,
  neutral: Minus,
};

/** Status with an icon AND a word, so it never relies on colour alone. */
export function StatusPill({ tone, children, icon }: { tone: PillTone; children: React.ReactNode; icon?: LucideIcon }) {
  const Icon = icon ?? PILL_ICON[tone];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ${PILL_TONE[tone]}`}>
      <Icon size={13} aria-hidden />
      {children}
    </span>
  );
}

/* ─────────────────────────── misc ─────────────────────────── */

export function ProgressBar({ value, label, tone = "green" }: { value: number; label: string; tone?: "green" | "warn" | "danger" }) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = tone === "danger" ? "bg-pp-danger" : tone === "warn" ? "bg-pp-gold" : "bg-pp-green";
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-pp-sunken"
    >
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function initialsOf(first?: string | null, last?: string | null): string {
  return `${first?.trim()?.[0] ?? ""}${last?.trim()?.[0] ?? ""}`.toUpperCase() || "?";
}

export function Avatar({
  first,
  last,
  src,
  size = 36,
  tone = "green",
}: {
  first?: string | null;
  last?: string | null;
  src?: string | null;
  size?: number;
  tone?: "green" | "gold";
}) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} style={style} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      aria-hidden
      style={style}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${
        tone === "gold" ? "bg-pp-gold/15 text-white ring-2 ring-pp-gold/70" : "bg-pp-green-tint text-pp-green"
      }`}
    >
      {initialsOf(first, last)}
    </span>
  );
}
