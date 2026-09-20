import CommunicationInbox from "@/components/parent/CommunicationInbox";
import { PageHeader } from "@/components/parent/ui";
import { getCommunications, getParentContext, getSchoolInfo } from "@/lib/parent/queries";

export default async function ParentMessagesPage() {
  const { profile } = await getParentContext();
  const school = await getSchoolInfo(profile.school_id, profile.school?.name ?? "Your school");
  const all = await getCommunications(profile.guardian_id, profile.school_id, school.name);
  // Messages = sent to your child's class, stream or to your child directly. Whole-school notices live under Notices.
  const items = all.filter((c) => c.scope === "personal");

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="Messages the school has sent about your child or their class." />
      <CommunicationInbox items={items} readScope={profile.id} emptyKind="messages" contact={{ schoolName: school.name, phone: school.phone, email: school.email }} />
    </div>
  );
}
