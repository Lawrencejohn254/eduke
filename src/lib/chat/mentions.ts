/**
 * @mentions travel inside the message text as  @[Display Name](profile-uuid).
 * The database extracts the ids from that same text, so what the sender sees is exactly what
 * gets notified — there is no separate, spoofable list.
 */

export const MENTION_PATTERN = "@\\[([^\\]]{1,80})\\]\\(([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\\)";

export type Segment = { type: "text"; text: string } | { type: "mention"; id: string; name: string };

/** Splits a stored message body into plain text and mention pieces for rendering. */
export function tokenizeBody(body: string): Segment[] {
  const re = new RegExp(MENTION_PATTERN, "g");
  const out: Segment[] = [];
  let last = 0;
  for (let m = re.exec(body); m; m = re.exec(body)) {
    if (m.index > last) out.push({ type: "text", text: body.slice(last, m.index) });
    out.push({ type: "mention", name: m[1], id: m[2].toLowerCase() });
    last = m.index + m[0].length;
  }
  if (last < body.length) out.push({ type: "text", text: body.slice(last) });
  return out;
}

export const mentionedIds = (body: string): string[] => [...new Set(tokenizeBody(body).filter((s): s is Extract<Segment, { type: "mention" }> => s.type === "mention").map((s) => s.id))];

/** Plain-text version for previews / toasts: "Hi @[Ann](…)" → "Hi @Ann". */
export const plainPreview = (body: string): string =>
  tokenizeBody(body)
    .map((s) => (s.type === "text" ? s.text : `@${s.name}`))
    .join("")
    .replace(/\s+/g, " ")
    .trim();

/** Names go inside [ ] and ( ) markup, so those characters (and stray whitespace) are stripped. */
export const safeMentionName = (name: string): string => name.replace(/[[\]()]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);

export type PendingMention = { id: string; name: string };

/**
 * The composer shows "@Grace Wanjiru" while typing. On send, each mention the user actually picked
 * from the list is turned into markup — but only if its text is still in the message (delete the
 * text and the mention goes away). Two people with the same name are matched in the order picked.
 */
export function serializeMentions(text: string, picked: PendingMention[]): string {
  let out = text;
  let searchFrom = 0;
  for (const p of picked) {
    const name = safeMentionName(p.name);
    if (!name) continue;
    const needle = `@${name}`;
    // find the next occurrence that is not already markup
    let idx = out.indexOf(needle, searchFrom);
    while (idx !== -1 && out[idx + needle.length] === "]") idx = out.indexOf(needle, idx + 1);
    if (idx === -1) continue;
    const replacement = `@[${name}](${p.id})`;
    out = out.slice(0, idx) + replacement + out.slice(idx + needle.length);
    searchFrom = idx + replacement.length;
  }
  return out;
}

/** If the caret sits right after "@partial", returns what has been typed so far and where "@" starts. */
export function activeMentionQuery(text: string, caret: number): { query: string; start: number } | null {
  const before = text.slice(0, caret);
  const m = /(^|[\s(])@([^\s@]{0,30}(?: [^\s@]{0,30})?)$/.exec(before);
  if (!m) return null;
  return { query: m[2], start: before.length - m[2].length - 1 };
}
