"use client";

import { useEffect, useState } from "react";

/**
 * TimeOfDayBackground
 * - Sky gradient interpolates continuously between keyframes across 24h
 *   (no hard jumps between "phases").
 * - Sun travels a left-to-right arc (rise -> zenith -> set). Its brightness
 *   is tied to actual clock time: fully bright/white-hot from 10am-4pm,
 *   dulling toward a warmer orange as it approaches sunrise/sunset.
 * - Moon takes over 18:00 -> 06:00 on the same arc shape, rendered as a
 *   crescent via a CSS mask (so the "bite" always shows the true sky behind
 *   it, matching at any hour).
 *
 * Usage:
 *   <div className="relative min-h-screen">
 *     <TimeOfDayBackground />
 *     <div className="relative z-10"> ...your login form... </div>
 *   </div>
 */

const SUNRISE_HOUR = 6;
const SUNSET_HOUR = 18;

// ---------- color interpolation helpers ----------

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex({ r, g, b }) {
  const c = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function lerpColor(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ---------- sky gradient keyframes (hour -> 4 gradient stops) ----------
// Colors chosen to move: deep night -> pre-dawn blue/violet -> golden sunrise
// haze -> clear midday blue -> golden sunset haze -> dusk violet -> night.

const SKY_KEYFRAMES = [
  { hour: 0, stops: ["#0b0e23", "#171b3a", "#2a2758", "#3a2f5c"] },
  { hour: 4.5, stops: ["#141a3a", "#2c2f5a", "#5a3f5e", "#7a5250"] },
  { hour: 6, stops: ["#274472", "#7a5a3f", "#e0912f", "#ffce6b"] }, // sunrise burst
  { hour: 8, stops: ["#2f6fb0", "#6d8fc0", "#bcd9ec", "#f2e6c9"] },
  { hour: 12, stops: ["#1f75c9", "#4fa3e3", "#bfe3fb", "#eef9ff"] }, // clear midday
  { hour: 16, stops: ["#2f6fb0", "#6d8fc0", "#bcd9ec", "#f2e6c9"] },
  { hour: 18, stops: ["#2a2350", "#7a3b4a", "#e2703f", "#ffb15e"] }, // sunset burst
  { hour: 19.5, stops: ["#1a1533", "#4a2f5e", "#a85a72", "#e8a06a"] },
  { hour: 21, stops: ["#0f1230", "#232152", "#463456", "#5c4658"] },
  { hour: 24, stops: ["#0b0e23", "#171b3a", "#2a2758", "#3a2f5c"] },
];

function getSkyGradient(decimalHours) {
  let lower = SKY_KEYFRAMES[0];
  let upper = SKY_KEYFRAMES[SKY_KEYFRAMES.length - 1];

  for (let i = 0; i < SKY_KEYFRAMES.length - 1; i++) {
    if (decimalHours >= SKY_KEYFRAMES[i].hour && decimalHours <= SKY_KEYFRAMES[i + 1].hour) {
      lower = SKY_KEYFRAMES[i];
      upper = SKY_KEYFRAMES[i + 1];
      break;
    }
  }

  const span = upper.hour - lower.hour || 1;
  const t = (decimalHours - lower.hour) / span;

  const stops = lower.stops.map((c, i) => lerpColor(c, upper.stops[i], t));
  return `linear-gradient(160deg, ${stops[0]} 0%, ${stops[1]} 35%, ${stops[2]} 70%, ${stops[3]} 100%)`;
}

// ---------- orb (sun/moon) position along the arc ----------

const LEFT_PCT = 8;
const RIGHT_PCT = 92;
const BASELINE_PCT = 88;
const APEX_LIFT_PCT = 68;

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
  const arcHeight = Math.sin(fraction * Math.PI); // 0 at horizon, 1 at zenith
  const yPct = BASELINE_PCT - APEX_LIFT_PCT * arcHeight;
  const opacity = Math.min(1, 0.25 + arcHeight * 1.1);

  return { isSun, xPct, yPct, opacity, arcHeight };
}

// ---------- sun appearance: bright/white-hot 10am-4pm, dulling toward sunrise/sunset ----------

const BRIGHT_START = 10; // fully bright from here...
const BRIGHT_END = 16; // ...through here

function getSunBrightness(decimalHours) {
  if (decimalHours <= SUNRISE_HOUR || decimalHours >= SUNSET_HOUR) return 0;
  if (decimalHours >= BRIGHT_START && decimalHours <= BRIGHT_END) return 1;
  if (decimalHours < BRIGHT_START) {
    return (decimalHours - SUNRISE_HOUR) / (BRIGHT_START - SUNRISE_HOUR);
  }
  return 1 - (decimalHours - BRIGHT_END) / (SUNSET_HOUR - BRIGHT_END);
}

function getSunAppearance(brightT) {
  return {
    highlight: lerpColor("#fff2c2", "#ffffff", brightT),
    mid: lerpColor("#ffb347", "#fff9c4", brightT),
    haloColor: lerpColor("#ff9d3d", "#fff6b0", brightT),
    haloAlpha: lerp(0.45, 0.7, brightT),
    haloSizeMult: lerp(3.2, 5.2, brightT),
    // A second, much larger and softer bloom layer that only really shows
    // up near peak brightness, giving the smooth wide falloff into the sky
    // seen in bright midday photos rather than a hard-edged halo.
    outerBloomSizeMult: lerp(4.0, 8.5, brightT),
    outerBloomAlpha: lerp(0.05, 0.32, brightT),
    glowBlur: lerp(0.5, 1.1, brightT),
    glowSpread: lerp(0.15, 0.4, brightT),
  };
}

const MOON_STYLE = {
  color: "#f4f1e8",
  glowCore: "#cfd8ff",
  glowOuter: "rgba(180, 195, 255, 0.4)",
  size: 78,
  pulseDuration: "7s",
  // Mask cuts a transparent circular "bite" out of the moon disc, offset
  // toward the upper-right, revealing the true sky gradient behind it.
  maskImage: "radial-gradient(circle at 68% 32%, transparent 0%, transparent 46%, black 48%)",
};

const SUN_SIZE = 110;

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
  // Defaults match on server and client (avoids hydration mismatch); real,
  // browser-local values are computed client-side in the effect below.
  const [decimalHours, setDecimalHours] = useState(12);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const tick = () => setDecimalHours(getDecimalHours(new Date()));
    tick();
    setMounted(true);
    const id = setInterval(tick, 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const orb = getOrbState(decimalHours);
  const skyGradient = getSkyGradient(decimalHours);
  const sun = orb.isSun ? getSunAppearance(getSunBrightness(decimalHours)) : null;

  const orbTransition = mounted
    ? "left 30s linear, top 30s linear, opacity 3s ease-in-out"
    : "none";

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: skyGradient,
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

      {/* Outer bloom: very large, very soft — only prominent near peak brightness */}
      {orb.isSun && (
        <div
          style={{
            position: "absolute",
            top: `${orb.yPct}%`,
            left: `${orb.xPct}%`,
            transform: "translate(-50%, -50%)",
            width: SUN_SIZE * sun.outerBloomSizeMult,
            height: SUN_SIZE * sun.outerBloomSizeMult,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${sun.haloColor}${Math.round(sun.outerBloomAlpha * 255).toString(16).padStart(2, "0")} 0%, transparent 65%)`,
            opacity: orb.opacity,
            mixBlendMode: "screen",
            transition: `${orbTransition}, background 3s ease-in-out, opacity 3s ease-in-out`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Outer halo */}
      <div
        style={{
          position: "absolute",
          top: `${orb.yPct}%`,
          left: `${orb.xPct}%`,
          transform: "translate(-50%, -50%)",
          width: orb.isSun ? SUN_SIZE * sun.haloSizeMult : MOON_STYLE.size * 3.2,
          height: orb.isSun ? SUN_SIZE * sun.haloSizeMult : MOON_STYLE.size * 3.2,
          borderRadius: "50%",
          background: orb.isSun
            ? `radial-gradient(circle, ${sun.haloColor}${Math.round(sun.haloAlpha * 255).toString(16).padStart(2, "0")} 0%, transparent 70%)`
            : `radial-gradient(circle, ${MOON_STYLE.glowOuter} 0%, transparent 70%)`,
          opacity: orb.opacity,
          mixBlendMode: orb.isSun ? "screen" : "normal",
          animation: `pulse-glow ${orb.isSun ? "5s" : MOON_STYLE.pulseDuration} ease-in-out infinite`,
          transition: orbTransition,
          pointerEvents: "none",
        }}
      />

      {/* Orb body: sun = full circle, warm-to-white-hot; moon = crescent via mask */}
      <div
        style={{
          position: "absolute",
          top: `${orb.yPct}%`,
          left: `${orb.xPct}%`,
          transform: "translate(-50%, -50%)",
          width: orb.isSun ? SUN_SIZE : MOON_STYLE.size,
          height: orb.isSun ? SUN_SIZE : MOON_STYLE.size,
          borderRadius: "50%",
          background: orb.isSun
            ? `radial-gradient(circle at 40% 35%, ${sun.highlight} 0%, ${sun.mid} 60%, ${sun.haloColor} 100%)`
            : `radial-gradient(circle at 35% 35%, #ffffff 0%, ${MOON_STYLE.color} 55%, ${MOON_STYLE.glowCore} 100%)`,
          opacity: orb.opacity,
          boxShadow: orb.isSun
            ? `0 0 ${SUN_SIZE * sun.glowBlur}px ${SUN_SIZE * sun.glowSpread}px ${sun.haloColor}`
            : `0 0 ${MOON_STYLE.size * 0.25}px ${MOON_STYLE.size * 0.05}px ${MOON_STYLE.glowCore}`,
          WebkitMaskImage: orb.isSun ? "none" : MOON_STYLE.maskImage,
          maskImage: orb.isSun ? "none" : MOON_STYLE.maskImage,
          mixBlendMode: orb.isSun ? "screen" : "normal",
          animation: `pulse-core ${orb.isSun ? "5s" : MOON_STYLE.pulseDuration} ease-in-out infinite`,
          transition: `${orbTransition}, background 3s ease-in-out, box-shadow 3s ease-in-out`,
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