import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import StaffRequestsList from "./StaffRequestsList";

export default async function StaffRequestsPage() {
  const profile = await getProfileOrRedirect();

  // Only authorized management roles should review staff requests
  const authorizedRoles = [
    "principal",
    "deputy_principal",
    "admin",
    "school_admin",
  ];

  if (!authorizedRoles.includes(profile.role)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: requests, error } = await supabase
    .from("staff_registration_requests")
    .select("*")
    .eq("school_id", profile.school_id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch staff requests:", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Staff Registration Requests
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Review and approve staff members requesting access to your school.
        </p>
      </div>

      <StaffRequestsList requests={requests ?? []} />
    </div>
  );
}