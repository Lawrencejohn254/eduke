import { getProfileOrRedirect } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";
import MyProfileForm from "./MyProfileForm";
export default async function ProfilePage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  // Get additional staff information where available
  const { data: staff } = profile.staff_id
    ? await supabase
        .from("staff")
        .select("gender, department, staff_number, photo_url, email, date_joined, status")
        .eq("id", profile.staff_id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          My Profile
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          View and manage your personal account information.
        </p>
      </div>

      <MyProfileForm
        profile={{
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          photo_url: profile.photo_url,
          role: profile.role,
          school_name: profile.school?.name ?? null,
        }}
        staff={{
          gender: staff?.gender ?? null,
          department: staff?.department ?? null,
          staff_number: staff?.staff_number ?? null,
          email: staff?.email ?? null,
          date_joined: staff?.date_joined ?? null,
          status: staff?.status ?? null,
        }}
      />
    </div>
  );
}