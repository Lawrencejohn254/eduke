"use client";

import { useEffect, useState } from "react";
import { X, Clock, ChevronRight } from "lucide-react";
import { colorOf } from "@/lib/timetable-colors";
import { formatDurationMinutes } from "@/lib/format";

type Slot = {
  id: string;
  title: string;
  color: string | null;
  start_time: string;
  end_time: string;
  stream?: { name: string; class: { name: string } | null } | null;
};

function nowAsTimeString(timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function minutesBetween(nowStr: string, targetTime: string) {
  const [nh, nm, ns] = nowStr.split(":").map(Number);
  const [th, tm] = targetTime.split(":").map(Number);
  const nowSeconds = nh * 3600 + nm * 60 + (ns ?? 0);
  const targetSeconds = th * 3600 + tm * 60;
  return Math.round((targetSeconds - nowSeconds) / 60);
}

const URGENT_THRESHOLD_MINUTES = 10;

export default function TimetableFloatingWidget({
  slots,
  timezone,
}: {
  slots: Slot[];
  timezone: string;
}) {
  const [now, setNow] = useState(() => nowAsTimeString(timezone));
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(nowAsTimeString(timezone)), 15000);
    return () => clearInterval(interval);
  }, [timezone]);

  if (dismissed || slots.length === 0) return null;

  const current = slots.find((s) => s.start_time <= now && now < s.end_time);
  const next = slots
    .filter((s) => s.start_time > now)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];

  if (!current && !next) return null; // day's classes are all done

  const minsToCurrentEnd = current ? minutesBetween(now, current.end_time) : null;
  const minsToNextStart = next ? minutesBetween(now, next.start_time) : null;

  const urgent =
    (minsToCurrentEnd !== null && minsToCurrentEnd <= URGENT_THRESHOLD_MINUTES) ||
    (minsToNextStart !== null && minsToNextStart <= URGENT_THRESHOLD_MINUTES);

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 w-72 bg-white rounded-xl shadow-lg border p-4 widget-enter ${
        urgent ? "border-red-300 widget-urgent" : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
          <Clock size={13} /> Today&apos;s Schedule
          {urgent && (
            <span className="relative flex h-2 w-2 ml-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
          )}
        </div>
        <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>

      {current &&
        (() => {
          const c = colorOf(current.color);
          return (
            <div
              className="rounded-lg p-3 mb-2 border widget-live"
              style={{ backgroundColor: c.bg, borderColor: c.border }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1.5"
                style={{ color: c.text, opacity: 0.7 }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Happening Now
              </p>
              <p className="text-sm font-semibold" style={{ color: c.text }}>
                {current.title}
              </p>
              {current.stream && (
                <p className="text-xs mt-0.5" style={{ color: c.text, opacity: 0.8 }}>
                  {current.stream.class?.name} {current.stream.name}
                </p>
              )}
              <p className="text-xs mt-1" style={{ color: c.text, opacity: 0.8 }}>
                Ends in {minsToCurrentEnd !== null && minsToCurrentEnd > 0
                  ? formatDurationMinutes(minsToCurrentEnd)
                  : "under a minute"}
              </p>
            </div>
          );
        })()}

      {next &&
        (() => {
          const c = colorOf(next.color);
          return (
            <div className="rounded-lg p-3 border border-gray-100 bg-gray-50">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1">
                <ChevronRight size={11} /> Next
              </p>
              <p className="text-sm font-semibold text-gray-800">{next.title}</p>
              {next.stream && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {next.stream.class?.name} {next.stream.name}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {next.start_time.slice(0, 5)} · starts in{" "}
                {minsToNextStart !== null ? formatDurationMinutes(minsToNextStart) : "-"}
              </p>
            </div>
          );
        })()}

      <style jsx>{`
        .widget-enter {
          animation: widgetEnter 0.5s ease-out;
        }
        @keyframes widgetEnter {
          0% {
            opacity: 0;
            transform: translateY(24px) scale(0.95);
          }
          60% {
            opacity: 1;
            transform: translateY(-4px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .widget-urgent {
          animation: widgetEnter 0.5s ease-out, widgetPulseBorder 1.6s ease-in-out infinite;
        }
        @keyframes widgetPulseBorder {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.35);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
        }
        .widget-live {
          animation: widgetLiveGlow 2s ease-in-out infinite;
        }
        @keyframes widgetLiveGlow {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.3);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
          }
        }
      `}</style>
    </div>
  );
}