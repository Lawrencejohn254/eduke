import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import BorrowingsList from "../../BorrowingsList";
import { canManageLibrary, isBorrowingOverdue } from "@/lib/library";

export default async function StudentLibraryHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();
  const canManage = canManageLibrary(profile.role);
  const { id } = await params;

  const { data: studentRow } = await supabase
    .from("students")
    .select("id, first_name, last_name, admission_number, class:classes(name)")
    .eq("id", id)
    .eq("school_id", profile.school_id)
    .maybeSingle();

  // Supabase's generated types infer this embed as an array even though the
  // FK (students.class_id -> classes.id) is to-one, so it always returns a
  // single object at runtime. Cast to the shape that actually comes back.
  const student = studentRow as unknown as {
    id: string;
    first_name: string;
    last_name: string;
    admission_number: string;
    class: { name: string } | null;
  } | null;

  if (!student) redirect("/library/students");

  const { data: borrowings, error } = await supabase
    .from("book_borrowings")
    .select("id, borrowed_date, due_date, returned_date, status, book_id, book:books!inner(title, school_id), student:students(first_name, last_name, admission_number)")
    .eq("student_id", id)
    .eq("book.school_id", profile.school_id)
    .order("borrowed_date", { ascending: false });

  const rows = (borrowings ?? []) as never as {
    id: string;
    borrowed_date: string;
    due_date: string | null;
    returned_date: string | null;
    status: string;
    book_id: string;
    book: { title: string } | null;
    student: { first_name: string; last_name: string; admission_number: string } | null;
  }[];

  // Buckets are mutually exclusive here (unlike the dashboard's stat cards,
  // where "Currently Borrowed" includes overdue ones as a subset) — for a
  // sectioned history view, each loan should appear in exactly one table.
  const currentlyBorrowed = rows.filter((b) => b.status === "Borrowed" && !isBorrowingOverdue(b.status, b.due_date));
  const overdue = rows.filter((b) => isBorrowingOverdue(b.status, b.due_date));
  const returned = rows.filter((b) => b.status === "Returned");
  const lost = rows.filter((b) => b.status === "Lost");
  const damaged = rows.filter((b) => b.status === "Damaged");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/library/students" className="text-xs font-medium text-eduke-green hover:underline flex items-center gap-1">
          <ArrowLeft size={13} /> Back to Students
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-2">
          <User size={20} /> {student.first_name} {student.last_name}
        </h1>
        <p className="text-sm text-gray-500">
          Admission No. {student.admission_number}{student.class ? ` · ${student.class.name}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryStat label="Currently Borrowed" value={currentlyBorrowed.length} />
        <SummaryStat label="Overdue" value={overdue.length} tone={overdue.length > 0 ? "danger" : "default"} />
        <SummaryStat label="Returned" value={returned.length} />
        <SummaryStat label="Lost" value={lost.length} tone={lost.length > 0 ? "danger" : "default"} />
        <SummaryStat label="Damaged" value={damaged.length} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <p className="font-semibold">Could not load this student&apos;s history.</p>
          <p className="mt-1 font-mono text-xs">{error.message}</p>
        </div>
      )}

      <Section title="Currently Borrowed">
        <BorrowingsList borrowings={currentlyBorrowed as never} canManage={canManage} showReturnAction emptyMessage="No books currently borrowed." />
      </Section>

      <Section title="Overdue">
        <BorrowingsList borrowings={overdue as never} canManage={canManage} showReturnAction emptyMessage="No overdue books." />
      </Section>

      <Section title="Returned">
        <BorrowingsList borrowings={returned as never} canManage={canManage} showReturnAction={false} emptyMessage="No returns on record." />
      </Section>

      <Section title="Lost">
        <BorrowingsList borrowings={lost as never} canManage={canManage} showReturnAction={false} emptyMessage="No lost books on record." />
      </Section>

      <Section title="Damaged">
        <BorrowingsList borrowings={damaged as never} canManage={canManage} showReturnAction={false} emptyMessage="No damaged books on record." />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function SummaryStat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "danger" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <p className={`text-xl font-bold ${tone === "danger" && value > 0 ? "text-red-600" : "text-gray-900"}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}