import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfileOrRedirect();

  if (profile.role === "parent") redirect("/parent");

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "User";

  return (
    <div className="flex min-h-screen">
      <Sidebar role={profile.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
  role={profile.role}
  name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()}
  schoolName={profile.school?.name}
/>
        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
