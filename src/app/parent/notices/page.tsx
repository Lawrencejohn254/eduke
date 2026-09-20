import CommunicationInbox from "@/components/parent/CommunicationInbox";
import { PageHeader } from "@/components/parent/ui";
import { getCommunications, getParentContext, getSchoolInfo } from "@/lib/parent/queries";

export default async function ParentNoticesPage() {
  const { profile } = await getParentContext();
  const school = await getSchoolInfo(profile.school_id, profile.school?.name ?? "Your school");
  const all = await getCommunications(profile.guardian_id, profile.school_id, school.name);
  const items = all.filter((c) => c.scope === "school");

  return (
    <div className="space-y-6">
      <PageHeader title="Notices" description="Announcements and updates for the whole school community." />
      <CommunicationInbox items={items} readScope={profile.id} emptyKind="notices" contact={{ schoolName: school.name, phone: school.phone, email: school.email }} />
    </div>
  );
}
