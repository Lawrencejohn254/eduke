import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role === "parent") redirect("/parent");
  if (profile?.role === "teacher" || profile?.role === "hod") redirect("/teacher-dashboard");
  if (profile?.role === "bursar") redirect("/bursar-dashboard");
  if (profile?.role === "librarian") redirect("/librarian-dashboard");
  if (profile?.role === "support_staff") redirect("/support-dashboard");
  redirect("/dashboard");
}
