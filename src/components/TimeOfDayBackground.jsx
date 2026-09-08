"use client";

import { useEffect, useState } from "react";

/**
 * TimeOfDayBackground
 * Full-viewport gradient background that shifts by local time of day:
 *  - Morning (5:00–11:00): sunrise gradient, sun low on the horizon
 *  - Day     (11:00–17:00): bright sky gradient, sun high and centered
 *  - Night   (17:00–5:00): deep gradient, moon + stars
 *
 * Usage: render it as an absolutely-positioned layer behind your login form.
 *   <div className="relative min-h-screen">
 *     <TimeOfDayBackground />
 *     <div className="relative z-10"> ...your login form... </div>
 *   </div>
 */

function getPhase(hour) {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

const PHASES = {
  dawn: {
    gradient: "linear-gradient(160deg, #2b2149 0%, #6b3a5e 35%, #d97a5f 70%, #f4b57a 100%)",
    orb: { top: "72%", color: "#ffd28a", glow: "#ffb86b", size: 90 },
    body: "sun",
  },
  morning: {
    gradient: "linear-gradient(160deg, #3a4a7a 0%, #6d7fb0 40%, #a9c3e0 75%, #f2e6c9 100%)",
    orb: { top: "38%", color: "#fff3cf", glow: "#ffe9a8", size: 110 },
    body: "sun",
  },
  day: {
    gradient: "linear-gradient(160deg, #2f6fb0 0%, #5b9bd6 45%, #a7d3ee 80%, #e8f4fb 100%)",
    orb: { top: "16%", color: "#fffdf5", glow: "#fff6c9", size: 130 },
    body: "sun",
  },
  dusk: {
    gradient: "linear-gradient(160deg, #1a1533 0%, #4a2f5e 40%, #a85a72 75%, #e8a06a 100%)",
    orb: { top: "60%", color: "#ffb199", glow: "#ff8f7a", size: 100 },
    body: "sun",
  },
  night: {
    gradient: "linear-gradient(160deg, #0b0e23 0%, #171b3a 45%, #2a2758 80%, #3a2f5c 100%)",
    orb: { top: "20%", color: "#f4f1e8", glow: "#cfd8ff", size: 80 },
    body: "moon",
  },
};

const STAR_POSITIONS = [
  { top: "12%", left: "18%", size: 2, delay: "0s" },
  { top: "22%", left: "72%", size: 2, delay: "0.4s" },
  { top: "8%", left: "45%", size: 1.5, delay: "0.8s" },
  { top: "35%", left: "85%", size: 1.5, delay: "1.2s" },
  { top: "48%", left: "10%", size: 2, delay: "1.6s" },
  { top: "30%", left: "30%", size: 1.5, delay: "2s" },
  { top: "55%", left: "60%", size: 2, delay: "0.6s" },
  { top: "15%", left: "60%", size: 1, delay: "1s" },
];

export default function TimeOfDayBackground() {
  // Default to "day" so server and client render identically on first paint.
  // The real, browser-local phase is computed client-side in the effect below.
  const [phase, setPhase] = useState("day");

  useEffect(() => {
    const tick = () => setPhase(getPhase(new Date().getHours()));
    tick();
    const id = setInterval(tick, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const config = PHASES[phase];

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: config.gradient,
        transition: "background 3s ease-in-out",
        zIndex: 0,
      }}
    >
      {config.body === "moon" &&
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

      <div
        style={{
          position: "absolute",
          top: config.orb.top,
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: config.orb.size,
          height: config.orb.size,
          borderRadius: "50%",
          background: config.orb.color,
          boxShadow: `0 0 ${config.orb.size * 0.9}px ${config.orb.size * 0.35}px ${config.orb.glow}`,
          transition: "top 3s ease-in-out, background 3s ease-in-out, box-shadow 3s ease-in-out",
        }}
      />

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}