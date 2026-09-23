"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

// Shared across every widget instance on the page so the <script> tag is
// only ever injected once, no matter how many forms mount over time.
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${SCRIPT_SRC}"]`
    );

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Turnstile"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export default function TurnstileWidget({
  onVerify,
}: {
  onVerify: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Shown when verification has been sitting unresolved for a while —
  // common on slow mobile data, where the challenge can silently stall.
  const [showStuckHelp, setShowStuckHelp] = useState(false);
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the latest callback in a ref so the render effect below doesn't
  // need onVerify as a dependency — that would re-render the widget on
  // every parent re-render if an inline arrow function is passed in.
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

  function startStuckTimer() {
    if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
    setShowStuckHelp(false);

    // If nothing has resolved (success or error) within 12s, mobile
    // networks are the usual reason — surface a manual retry instead of
    // leaving the visitor staring at a spinner indefinitely.
    stuckTimerRef.current = setTimeout(() => {
      setShowStuckHelp(true);
    }, 12000);
  }

  function clearStuckTimer() {
    if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
    setShowStuckHelp(false);
  }

  function handleManualRetry() {
    clearStuckTimer();
    onVerifyRef.current(null);

    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      startStuckTimer();
    }
  }

  useEffect(() => {
    let cancelled = false;
    let retryInterval: ReturnType<typeof setInterval> | null = null;

    function renderWidget() {
      if (
        cancelled ||
        !containerRef.current ||
        !window.turnstile ||
        widgetIdRef.current // already rendered, nothing to do
      ) {
        return;
      }

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,

          callback: (token: string) => {
            clearStuckTimer();
            onVerifyRef.current(token);
          },
          "expired-callback": () => {
            onVerifyRef.current(null);
            startStuckTimer();
          },
          "error-callback": () => {
            onVerifyRef.current(null);
            startStuckTimer();
          },
          // Fires specifically when an interactive challenge (the part
          // most likely to stall on slow mobile connections) times out.
          "timeout-callback": () => {
            onVerifyRef.current(null);
            if (widgetIdRef.current && window.turnstile) {
              window.turnstile.reset(widgetIdRef.current);
            }
            startStuckTimer();
          },

          // Cloudflare tokens are valid for ~5 minutes. "auto" silently
          // fetches a fresh token shortly before the old one expires, in
          // the background, with no reload and no user action needed.
          "refresh-expired": "auto",
          // Same idea, but for a stalled interactive challenge itself.
          "refresh-timeout": "auto",

          // Retry failed/slow requests automatically, faster than the
          // 8s default — helps on flaky mobile connections.
          retry: "auto",
          "retry-interval": 3000,
        });

        startStuckTimer();
      } catch {
        // container not ready yet, or script briefly unavailable —
        // the retry interval below will pick this up on the next tick
      }
    }

    loadTurnstileScript()
      .then(renderWidget)
      .catch((err) => {
        console.error("Turnstile failed to load:", err);
      });

    // Safety net: if the widget still hasn't rendered a few seconds after
    // mount (e.g. the script was still loading, or a client-side route
    // change beat it to the punch), keep retrying every 10s instead of
    // requiring the user to hard-refresh the page.
    retryInterval = setInterval(() => {
      if (widgetIdRef.current) {
        if (retryInterval) clearInterval(retryInterval);
        return;
      }
      renderWidget();
    }, 10000);

    return () => {
      cancelled = true;

      if (retryInterval) clearInterval(retryInterval);
      if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);

      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, []);

  return (
    <div>
      <div ref={containerRef} />

      {showStuckHelp && (
        <button
          type="button"
          onClick={handleManualRetry}
          className="mt-2 text-xs font-medium text-eduke-green hover:underline"
        >
          Taking a while to verify? Tap to try again
        </button>
      )}
    </div>
  );
}