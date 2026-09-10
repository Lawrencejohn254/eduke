
import StaffRegistrationForm from "@/components/auth/StaffRegistrationForm";
import TimeOfDayBackground from "@/components/TimeOfDayBackground";

export default function CreateAccountPage() {
  return (
    <main className="relative min-h-screen py-10 px-4 overflow-hidden">
      {/* Time-of-day animated background */}
      <TimeOfDayBackground />

      {/* Page content */}
      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white drop-shadow-sm">
            Create Your Staff Account
          </h1>

          <p className="text-white/80 mt-2 drop-shadow-sm">
            Register with your school and wait for approval from your school
            administrator.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-6 md:p-8">
          <StaffRegistrationForm />
        </div>
      </div>
    </main>
  );
}
