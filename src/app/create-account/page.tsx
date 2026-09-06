import StaffRegistrationForm from "@/components/auth/StaffRegistrationForm";

export default function CreateAccountPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Create Your Staff Account
          </h1>

          <p className="text-gray-500 mt-2">
            Register with your school and wait for approval from your school
            administrator.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
          <StaffRegistrationForm />
        </div>
      </div>
    </main>
  );
}