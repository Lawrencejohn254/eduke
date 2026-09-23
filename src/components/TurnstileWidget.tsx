"use client";

import { useEffect, useRef } from "react";

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

  // Keep the latest callback in a ref so the render effect below doesn't
  // need onVerify as a dependency — that would re-render the widget on
  // every parent re-render if an inline arrow function is passed in.
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

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
          callback: (token: string) => onVerifyRef.current(token),
          "expired-callback": () => onVerifyRef.current(null),
          "error-callback": () => onVerifyRef.current(null),
          // Cloudflare tokens are valid for ~5 minutes. "auto" makes the
          // widget silently fetch a fresh token shortly before the old one
          // expires, in the background, with no reload and no user action.
          "refresh-expired": "auto",
        });
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

      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, []);

  return <div ref={containerRef} />;
}