import { Public_Sans, Source_Serif_4 } from "next/font/google";
import ParentShell from "@/components/parent/ParentShell";
import { getCommunications, getSchoolInfo } from "@/lib/parent/queries";
import { getProfileOrRedirect } from "@/lib/get-profile";

// Loaded here (not in the root layout) so the rest of the app keeps its current typography.
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif", display: "swap" });

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfileOrRedirect();
  const fallbackSchool = profile.school?.name ?? "Your school";

  const [school, communications] = await Promise.all([
    getSchoolInfo(profile.school_id, fallbackSchool),
    getCommunications(profile.guardian_id, profile.school_id, fallbackSchool),
  ]);

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Parent";

  return (
    <div className={`${publicSans.variable} ${sourceSerif.variable}`}>
      <ParentShell
        user={{ name, firstName: profile.first_name ?? "", lastName: profile.last_name ?? "", photoUrl: profile.photo_url }}
        schoolName={school.name}
        readScope={profile.id}
        communications={communications.slice(0, 20).map((c) => ({
          id: c.id,
          title: c.title,
          message: c.message,
          type: c.type,
          scope: c.scope,
          relative: c.relative,
          recent: c.recent,
        }))}
      >
        {children}
      </ParentShell>
    </div>
  );
}
