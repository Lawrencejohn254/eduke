import { requirePlatformAdmin } from "@/lib/platform-admin";

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-black px-6 py-3 text-xs text-gray-400 border-b border-gray-800 flex items-center gap-2">
        <span className="text-eduke-gold font-bold">⚠ PLATFORM ADMIN</span>
        <span>— cross-school data. This is not a school's normal view. Handle with care.</span>
      </div>
      <main className="p-6 max-w-6xl mx-auto">{children}</main>
    </div>
  );
}