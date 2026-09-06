import { getProfileOrRedirect } from "@/lib/get-profile";
import ParentBottomNav from "@/components/ParentBottomNav";
import ParentTopBar from "@/components/ParentTopBar";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfileOrRedirect();
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Parent";

  return (
    <div className="min-h-screen flex flex-col">
      <ParentTopBar name={name} />
      <main className="flex-1 p-4 md:p-6 max-w-3xl w-full mx-auto pb-20 md:pb-6">{children}</main>
      <ParentBottomNav />
    </div>
  );
}
