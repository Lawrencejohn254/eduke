import { Suspense } from "react";
import { MessagesSquare } from "lucide-react";
import ChatApp from "@/components/chat/ChatApp";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { supabaseChatApi } from "@/lib/chat/api";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Chat · EduKe" };

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-eduke-green/10 text-eduke-green">
        <MessagesSquare size={22} aria-hidden />
      </span>
      <h1 className="text-lg font-bold text-gray-900">{title}</h1>
      <div className="mt-2 text-sm text-gray-600">{children}</div>
    </div>
  );
}

export default async function StaffChatPage() {
  const profile = await getProfileOrRedirect();
  const api = supabaseChatApi(await createClient());

  let initial;
  try {
    // One round trip each, all authorised inside the database (caller must be an active staff account).
    const [conversations, invites, directory] = await Promise.all([api.conversations(), api.invites(), api.directory()]);
    initial = { conversations, invites, directory };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/only available to active staff/i.test(msg)) {
      return <Notice title="Chat isn't available yet">Your account needs to be active before you can use staff chat. Please contact your school administrator.</Notice>;
    }
    if (/could not find the function|does not exist|schema cache/i.test(msg)) {
      return (
        <Notice title="Chat is almost ready">
          The database part of staff chat hasn&apos;t been installed yet. An administrator needs to run <code className="rounded bg-gray-100 px-1">0004_staff_chat.sql</code> in Supabase.
        </Notice>
      );
    }
    throw e;
  }

  return (
    <Suspense fallback={null}>
      <ChatApp meId={profile.id} initial={initial} />
    </Suspense>
  );
}
