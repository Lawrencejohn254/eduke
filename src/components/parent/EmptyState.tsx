import Link from "next/link";
import { BookOpen, Wallet, CalendarCheck, CalendarClock, Bell, MessageSquare, Users, Megaphone, type LucideIcon } from "lucide-react";

export type EmptyKind = "children" | "results" | "attendance" | "fees" | "timetable" | "notifications" | "messages" | "notices";

const KIND: Record<EmptyKind, { icon: LucideIcon; title: string; description: string }> = {
  children: {
    icon: Users,
    title: "No children linked yet",
    description: "Once the school office links your account to your child's record, they'll appear here.",
  },
  results: {
    icon: BookOpen,
    title: "No results available yet",
    description: "Your child's academic results will appear here once the school publishes them.",
  },
  attendance: {
    icon: CalendarCheck,
    title: "No attendance records yet",
    description: "Daily attendance will appear here once the class teacher records it.",
  },
  fees: {
    icon: Wallet,
    title: "No fee records yet",
    description: "Fee statements and payments will appear here once the school sets up this term's fees.",
  },
  timetable: {
    icon: CalendarClock,
    title: "No timetable yet",
    description: "Your child's weekly lessons will appear here once their teachers set the timetable.",
  },
  notifications: {
    icon: Bell,
    title: "You're all caught up",
    description: "New updates from the school will show up here.",
  },
  messages: {
    icon: MessageSquare,
    title: "No messages yet",
    description: "Messages the school sends about your child or their class will appear here.",
  },
  notices: {
    icon: Megaphone,
    title: "No notices yet",
    description: "School-wide announcements will appear here when the school publishes them.",
  },
};

/** Line-icon empty state: a quiet, professional prompt rather than a cartoon. */
export default function EmptyState({
  kind,
  title,
  description,
  action,
  compact = false,
}: {
  kind: EmptyKind;
  title?: string;
  description?: string;
  action?: { href: string; label: string };
  compact?: boolean;
}) {
  const meta = KIND[kind];
  const Icon = meta.icon;
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-pp-rule-strong bg-pp-surface text-center ${
        compact ? "px-4 py-8" : "px-6 py-14"
      }`}
    >
      <span className="relative mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-pp-green-tint text-pp-green">
        <Icon size={26} strokeWidth={1.6} aria-hidden />
        <span aria-hidden className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-pp-surface bg-pp-gold" />
      </span>
      <p className="font-display text-[1.125rem] font-semibold text-pp-ink">{title ?? meta.title}</p>
      <p className="mt-1.5 max-w-sm text-[0.875rem] leading-relaxed text-pp-muted">{description ?? meta.description}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-pp-green px-4 text-[0.875rem] font-semibold text-white hover:bg-pp-green-deep"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
