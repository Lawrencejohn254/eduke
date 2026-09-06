import { getProfileOrRedirect } from "@/lib/get-profile";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfileOrRedirect();

  const fullName =
    `${profile.first_name ?? ""} ${
      profile.last_name ?? ""
    }`.trim();

  return (
    <div className="min-h-screen flex bg-eduke-bg">

      {/* Desktop Sidebar */}
      <Sidebar role={profile.role} />

      {/* Main Application Area */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Shared Top Navigation */}
        <TopBar
          role={profile.role}
          name={fullName || "User"}
          schoolName={profile.school?.name ?? null}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>

      </div>
    </div>
  );
}