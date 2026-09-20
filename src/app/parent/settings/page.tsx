import Link from "next/link";
import { Bell, Mail, Plus, Smartphone } from "lucide-react";
import AccountForm from "@/components/parent/AccountForm";
import { Avatar, PageHeader, Panel } from "@/components/parent/ui";
import { childSubtitle } from "@/components/parent/StudentPlate";
import { createClient } from "@/lib/supabase/server";
import { getParentContext, getSchoolInfo } from "@/lib/parent/queries";

export default async function ParentSettingsPage() {
  const { profile, children } = await getParentContext();
  const supabase = await createClient();
  const school = await getSchoolInfo(profile.school_id, profile.school?.name ?? "Your school");

  const [{ data: authData }, guardianRes] = await Promise.all([
    supabase.auth.getUser(),
    profile.guardian_id
      ? supabase.from("guardians").select("phone_primary, phone_secondary, email, relationship").eq("id", profile.guardian_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const guardian = guardianRes.data as { phone_primary: string | null; phone_secondary: string | null; email: string | null; relationship: string | null } | null;
  const accountEmail = authData.user?.email ?? null;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your account, how the school contacts you, and the children linked to you." />

      <Panel id="profile" title="Parent profile" description={accountEmail ? `Signed in as ${accountEmail}` : undefined}>
        <AccountForm profile={{ id: profile.id, first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone, photo_url: profile.photo_url }} />
      </Panel>

      <Panel id="notifications" title="Notification preferences" description="How the school reaches you">
        <ul className="space-y-4">
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pp-green-tint text-pp-green">
              <Smartphone size={17} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-medium">SMS</p>
              <p className="text-[0.875rem] text-pp-muted">
                {guardian?.phone_primary ? (
                  <>
                    Sent to <span className="pp-num font-medium text-pp-ink">{guardian.phone_primary}</span>
                    {guardian.phone_secondary ? <> and {guardian.phone_secondary}</> : null}
                  </>
                ) : (
                  "No phone number is on file for you yet."
                )}
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pp-green-tint text-pp-green">
              <Mail size={17} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-medium">Email</p>
              <p className="break-words text-[0.875rem] text-pp-muted">{guardian?.email ?? accountEmail ?? "No email address is on file for you yet."}</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pp-green-tint text-pp-green">
              <Bell size={17} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-medium">In this portal</p>
              <p className="text-[0.875rem] text-pp-muted">
                Messages and notices appear under <Link href="/parent/messages" className="font-medium text-pp-green hover:underline">Messages</Link> and{" "}
                <Link href="/parent/notices" className="font-medium text-pp-green hover:underline">Notices</Link>. Which ones you&apos;ve read is remembered on this device only.
              </p>
            </div>
          </li>
        </ul>
        <p className="mt-5 border-t border-pp-rule pt-4 text-[0.8125rem] text-pp-muted">
          Choosing which alerts you receive isn&apos;t available yet. To change the contact details the school has on file, please contact {school.name}
          {school.phone ? ` on ${school.phone}` : ""}.
        </p>
      </Panel>

      <Panel id="children" title="Linked children" action={{ href: "/link-child", label: "Link another child" }} bodyClassName="p-0">
        {children.length === 0 ? (
          <p className="px-5 py-8 text-center text-[0.875rem] text-pp-muted">No children are linked to your account yet.</p>
        ) : (
          <ul className="divide-y divide-pp-rule">
            {children.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar first={c.first_name} last={c.last_name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] font-medium">
                    {c.first_name} {c.last_name}
                  </p>
                  <p className="truncate text-[0.8125rem] text-pp-muted">{childSubtitle(c, school.name)}</p>
                </div>
                {c.admission_number ? <span className="pp-num hidden text-[0.8125rem] text-pp-muted sm:inline">Adm. {c.admission_number}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <p className="flex items-center gap-1.5 text-[0.8125rem] text-pp-muted">
        <Plus size={14} aria-hidden /> Need to add another child? Use <Link href="/link-child" className="font-medium text-pp-green hover:underline">Link another child</Link>; the school office will verify the link.
      </p>
    </div>
  );
}
