"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Per-device "read" tracking for school communications.
 *
 * Why device-local: parents can't read notification_recipients under the current RLS policies, so the
 * database has no per-parent read receipt to consult. Storing read ids in localStorage needs no backend
 * change and never exposes anything. (Server-side read receipts would need a new policy/table.)
 *
 * Built on useSyncExternalStore so the bell, the sidebar counts and the inbox stay in sync within a
 * tab (custom event) and across tabs (storage event) — and render "unknown" on the server, so there is
 * never a hydration mismatch.
 */

const CHANGE_EVENT = "eduke:parent-read-change";
const MAX_IDS = 400;
const keyFor = (scope: string) => `eduke:parent:read:v1:${scope}`;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function readRaw(scope: string): string {
  try {
    return window.localStorage.getItem(keyFor(scope)) ?? "[]";
  } catch {
    return "[]"; // storage blocked (private mode) — behave as "nothing read yet"
  }
}

function parseIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function useReadState(scope: string) {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(scope),
    () => null // server: unknown
  );

  const ready = raw !== null;
  const readIds = useMemo(() => new Set(raw ? parseIds(raw) : []), [raw]);

  const markRead = useCallback(
    (ids: string[]) => {
      const current = parseIds(readRaw(scope));
      const merged = [...new Set([...current, ...ids])].slice(-MAX_IDS);
      if (merged.length === current.length) return;
      try {
        window.localStorage.setItem(keyFor(scope), JSON.stringify(merged));
      } catch {
        /* storage full or blocked — read state simply won't persist */
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [scope]
  );

  const isUnread = useCallback((item: { id: string; recent: boolean }) => ready && item.recent && !readIds.has(item.id), [ready, readIds]);

  return { ready, readIds, isUnread, markRead };
}
