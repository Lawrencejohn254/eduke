import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SignupsClient from "./SignupsClient";

export default async function PlatformAdminSignupsPage() {
  const admin = createAdminClient();

  const {
  data: requests,
  error,
} = await admin
  .from("school_signup_requests")
  .select("*")
  .order("created_at", { ascending: false });

if (error) {
  console.error("Failed to load signup requests:", error);
  throw new Error(
    `Failed to load signup requests: ${error.message}`
  );
}

  return (
    <div className="space-y-6">
      <Link href="/platform-admin" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white w-fit">
        <ArrowLeft size={15} /> Back to all schools
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">School Signup Requests</h1>
        <p className="text-sm text-gray-400">Review and approve or reject new school registrations.</p>
      </div>

      <SignupsClient requests={requests ?? []} />
    </div>
  );
}