/** Tiny in-page event bus: one realtime connection (StaffChatNotifier) feeds the sidebar badge and the open chat. */
export type ChatEventType = "message" | "invite" | "membership" | "refresh";
const NAME = "eduke:staffchat";

export function emitChat(type: ChatEventType, detail?: unknown) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(NAME, { detail: { type, detail } }));
}

export function onChat(handler: (type: ChatEventType, detail: unknown) => void): () => void {
  const fn = (e: Event) => {
    const d = (e as CustomEvent).detail as { type: ChatEventType; detail: unknown };
    handler(d.type, d.detail);
  };
  window.addEventListener(NAME, fn);
  return () => window.removeEventListener(NAME, fn);
}
