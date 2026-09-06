import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import AIInsightsClient from "./AIInsightsClient";

const ALLOWED_ROLES = ["principal", "deputy_principal", "super_admin", "hod", "bursar", "teacher"];

const SUGGESTED_PROMPTS: Record<string, string[]> = {
  principal: [
    "Which students are performing best overall?",
    "Which teachers are getting the strongest results?",
    "Who has the highest outstanding fee balance?",
    "Which classes have the lowest attendance?",
  ],
  deputy_principal: [
    "Which students are performing best overall?",
    "Which teachers are getting the strongest results?",
    "Who has the highest outstanding fee balance?",
    "Which classes have the lowest attendance?",
  ],
  super_admin: [
    "Which students are performing best overall?",
    "Which teachers are getting the strongest results?",
    "Which subjects need attention school-wide?",
  ],
  hod: [
    "Which students in my department need extra support?",
    "How are the subjects in my department performing?",
    "Which teachers are getting the strongest results?",
  ],
  bursar: [
    "Who has the highest outstanding fee balance?",
    "How much has been collected so far this term?",
    "How many students are behind on fees?",
  ],
  teacher: [
    "Which of my students are struggling?",
    "Which of my students are doing well?",
    "How is my class performing overall?",
  ],
};

export default async function AIInsightsPage() {
  const profile = await getProfileOrRedirect();
  if (!ALLOWED_ROLES.includes(profile.role)) redirect("/dashboard");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles size={20} className="text-indigo-600" /> AI Insights
        </h1>
        <p className="text-sm text-gray-500">
          Ask a question in plain language — the answer is grounded in your school&apos;s real data, not guessed.
        </p>
      </div>
      <AIInsightsClient suggestedPrompts={SUGGESTED_PROMPTS[profile.role] ?? []} />
    </div>
  );
}
