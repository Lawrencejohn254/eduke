import { tokenizeBody } from "@/lib/chat/mentions";
import { cleanName } from "@/lib/chat/roles";
import type { DirectoryEntry } from "@/lib/chat/types";

/** Renders text with @mentions highlighted. The name shown comes from the live directory, not from the message text. */
export default function MessageBody({ body, directory, meId, mine }: { body: string; directory: Map<string, DirectoryEntry>; meId: string; mine: boolean }) {
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {tokenizeBody(body).map((s, i) => {
        if (s.type === "text") return <span key={i}>{s.text}</span>;
        const person = directory.get(s.id);
        const name = person ? cleanName(person.first_name, person.last_name) : s.name;
        const me = s.id === meId.toLowerCase();
        return (
          <span
            key={i}
            className={`rounded px-1 font-semibold ${
              mine ? "bg-white/25 text-white" : me ? "bg-amber-200 text-amber-900" : "bg-eduke-green/10 text-eduke-green"
            }`}
          >
            @{name}
            {me ? <span className="sr-only"> (you)</span> : null}
          </span>
        );
      })}
    </p>
  );
}
