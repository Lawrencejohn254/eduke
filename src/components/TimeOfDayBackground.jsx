"use client";

import { useEffect, useState } from "react";

/**
 * TimeOfDayBackground
 * Full-viewport gradient background with a sun/moon that travels a smooth
 * arc from mid-left to mid-right:
 *   - Sun is up from 06:00 -> 18:00, rising at the left, peaking at the top
 *     center around noon, setting at the right.
 *   - Moon takes over from 18:00 -> 06:00 (next day), tracing the same
 *     left-to-right arc.
 * Background gradient still shifts through 5 named phases (dawn/morning/
 * day/dusk/night) for color, independent of the orb's continuous position.
 *
 * Usage: render as an absolutely-positioned layer behind your login form.
 *   <div className="relative min-h-screen">
 *     <TimeOfDayBackground />
 *     <div className="relative z-10"> ...your login form... </div>
 *   </div>
 */

const SUNRISE_HOUR = 6;
const SUNSET_HOUR = 18;

function getPhase(hour) {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

const GRADIENTS = {
  dawn: "linear-gradient(160deg, #2b2149 0%, #6b3a5e 35%, #d97a5f 70%, #f4b57a 100%)",
  morning: "linear-gradient(160deg, #3a4a7a 0%, #6d7fb0 40%, #a9c3e0 75%, #f2e6c9 100%)",
  day: "linear-gradient(160deg, #2f6fb0 0%, #5b9bd6 45%, #a7d3ee 80%, #e8f4fb 100%)",
  dusk: "linear-gradient(160deg, #1a1533 0%, #4a2f5e 40%, #a85a72 75%, #e8a06a 100%)",
  night: "linear-gradient(160deg, #0b0e23 0%, #171b3a 45%, #2a2758 80%, #3a2f5c 100%)",
};

const SUN_STYLE = {
  color: "#ff9d3d",
  glowCore: "#ff7a1a",
  glowOuter: "rgba(255, 122, 26, 0.65)",
  size: 110,
  pulseDuration: "5s",
  isCrescent: false,
};
const MOON_STYLE = {
  color: "#f4f1e8",
  glowCore: "#cfd8ff",
  glowOuter: "rgba(180, 195, 255, 0.4)",
  size: 78,
  pulseDuration: "7s",
  isCrescent: true,
  // Mask cuts a transparent circular "bite" out of the moon disc, offset
  // toward the upper-right, revealing the true sky gradient behind it
  // (rather than painting a fixed color) so it looks correct at any hour.
  maskImage:
    "radial-gradient(circle at 68% 32%, transparent 0%, transparent 46%, black 48%)",
};

const LEFT_PCT = 8;
const RIGHT_PCT = 92;
const BASELINE_PCT = 88; // vertical position at rise/set (near horizon)
const APEX_LIFT_PCT = 68; // how high the arc climbs above the baseline at its peak

/**
 * Given decimal hours (e.g. 14.5 = 2:30pm), return whether the sun or moon
 * is currently up, plus its position as percentages along a left-to-right
 * arc (0 = just rising on the left, 1 = just setting on the right).
 */
function getOrbState(decimalHours) {
  let isSun;
  let fraction;

  if (decimalHours >= SUNRISE_HOUR && decimalHours < SUNSET_HOUR) {
    isSun = true;
    fraction = (decimalHours - SUNRISE_HOUR) / (SUNSET_HOUR - SUNRISE_HOUR);
  } else {
    isSun = false;
    if (decimalHours >= SUNSET_HOUR) {
      fraction = (decimalHours - SUNSET_HOUR) / (24 - SUNSET_HOUR + SUNRISE_HOUR);
    } else {
      fraction = (decimalHours + (24 - SUNSET_HOUR)) / (24 - SUNSET_HOUR + SUNRISE_HOUR);
    }
  }

  fraction = Math.min(1, Math.max(0, fraction));

  const xPct = LEFT_PCT + (RIGHT_PCT - LEFT_PCT) * fraction;
  // sin(0) = 0 at rise/set, peaks at the midpoint -> arc shape
  const arcHeight = Math.sin(fraction * Math.PI);
  const yPct = BASELINE_PCT - APEX_LIFT_PCT * arcHeight;
  // fade in/out near the horizon edges so it doesn't look like it pops in
  const opacity = Math.min(1, 0.25 + arcHeight * 1.1);

  return { isSun, xPct, yPct, opacity };
}

const STAR_POSITIONS = [
  { top: "10%", left: "18%", size: 2, delay: "0s" },
  { top: "20%", left: "75%", size: 2, delay: "0.4s" },
  { top: "6%", left: "45%", size: 1.5, delay: "0.8s" },
  { top: "30%", left: "88%", size: 1.5, delay: "1.2s" },
  { top: "42%", left: "8%", size: 2, delay: "1.6s" },
  { top: "26%", left: "30%", size: 1.5, delay: "2s" },
  { top: "48%", left: "62%", size: 2, delay: "0.6s" },
  { top: "14%", left: "58%", size: 1, delay: "1s" },
];

function getDecimalHours(date) {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

export default function TimeOfDayBackground() {
  // Defaults chosen to match on server and client (avoids hydration mismatch);
  // the real, browser-local values are computed client-side in the effect below.
  const [phase, setPhase] = useState("day");
  const [orb, setOrb] = useState({ isSun: true, xPct: 50, yPct: 20, opacity: 1 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setPhase(getPhase(now.getHours()));
      setOrb(getOrbState(getDecimalHours(now)));
    };
    tick();
    setMounted(true);
    // Updating every 30s keeps the arc creeping smoothly without excessive re-renders.
    const id = setInterval(tick, 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const orbStyle = orb.isSun ? SUN_STYLE : MOON_STYLE;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: GRADIENTS[phase],
        transition: "background 3s ease-in-out",
        zIndex: 0,
      }}
    >
      {!orb.isSun &&
        STAR_POSITIONS.map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              borderRadius: "50%",
              background: "#ffffff",
              opacity: 0.85,
              animation: `twinkle 3.5s ease-in-out ${s.delay} infinite`,
            }}
          />
        ))}

      {/* Outer halo: a soft, larger radial glow that pulses gently */}
      <div
        style={{
          position: "absolute",
          top: `${orb.yPct}%`,
          left: `${orb.xPct}%`,
          transform: "translate(-50%, -50%)",
          width: orbStyle.size * 3.2,
          height: orbStyle.size * 3.2,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${orbStyle.glowOuter} 0%, transparent 70%)`,
          opacity: orb.opacity,
          animation: `pulse-glow ${orbStyle.pulseDuration} ease-in-out infinite`,
          transition: mounted
            ? "left 30s linear, top 30s linear, opacity 3s ease-in-out"
            : "none",
          pointerEvents: "none",
        }}
      />

      {/* Orb body with a tight bright core glow (sun: full circle, moon: crescent via mask) */}
      <div
        style={{
          position: "absolute",
          top: `${orb.yPct}%`,
          left: `${orb.xPct}%`,
          transform: "translate(-50%, -50%)",
          width: orbStyle.size,
          height: orbStyle.size,
          borderRadius: "50%",
          background: orbStyle.isCrescent
            ? `radial-gradient(circle at 35% 35%, #ffffff 0%, ${orbStyle.color} 55%, ${orbStyle.glowCore} 100%)`
            : `radial-gradient(circle at 40% 35%, #ffe6b8 0%, ${orbStyle.color} 45%, ${orbStyle.glowCore} 100%)`,
          opacity: orb.opacity,
          // Full box-shadow glow only for the sun; a crescent moon uses a
          // softer, contained shadow so light doesn't leak in a full circle
          // behind the masked-away part of the disc.
          boxShadow: orbStyle.isCrescent
            ? `0 0 ${orbStyle.size * 0.25}px ${orbStyle.size * 0.05}px ${orbStyle.glowCore}`
            : `0 0 ${orbStyle.size * 0.6}px ${orbStyle.size * 0.2}px ${orbStyle.glowCore}`,
          WebkitMaskImage: orbStyle.isCrescent ? orbStyle.maskImage : "none",
          maskImage: orbStyle.isCrescent ? orbStyle.maskImage : "none",
          animation: `pulse-core ${orbStyle.pulseDuration} ease-in-out infinite`,
          // Linear + duration matched to the tick interval so motion reads as
          // one continuous creep across the sky rather than periodic jumps.
          transition: mounted
            ? "left 30s linear, top 30s linear, opacity 3s ease-in-out, background 3s ease-in-out"
            : "none",
        }}
      />

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes pulse-core {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.12); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}