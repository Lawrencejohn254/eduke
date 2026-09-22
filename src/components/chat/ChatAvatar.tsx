import { UsersRound } from "lucide-react";
import { initialsOf } from "@/lib/chat/roles";

export default function ChatAvatar({ name, photo, size = 36, group = false }: { name: string; photo?: string | null; size?: number; group?: boolean }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (group) {
    return (
      <span style={style} aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full bg-eduke-green text-white">
        <UsersRound size={Math.round(size * 0.5)} />
      </span>
    );
  }
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" style={style} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <span style={style} aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full bg-eduke-green/10 font-semibold text-eduke-green">
      {initialsOf(name)}
    </span>
  );
}
