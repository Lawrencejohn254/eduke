import { CircleCheck, Receipt, Wallet, Banknote } from "lucide-react";
import EmptyState from "@/components/parent/EmptyState";
import ReceiptButton from "@/components/parent/ReceiptButton";
import StudentPlate from "@/components/parent/StudentPlate";
import { Ledger, LedgerItem, PageHeader, Panel, ProgressBar, StatusPill } from "@/components/parent/ui";
import { createClient } from "@/lib/supabase/server";
import { getFeeSummary } from "@/lib/parent/fees";
import { formatKSh } from "@/lib/parent/money";
import { formatDayMonth } from "@/lib/parent/time";
import { getCurrentTerm, getParentContext, getPayments, getSchoolInfo, type PaymentRow } from "@/lib/parent/queries";
import PayFeesButton from "./PayFeesButton";
import FeeStructureCard from "./FeeStructureCard";

function StatusFor({ status }: { status: PaymentRow["status"] }) {
  if (status === "Confirmed") return <StatusPill tone="good">Paid</StatusPill>;
  if (status === "Pending") return <StatusPill tone="warn">Pending</StatusPill>;
  return <StatusPill tone="danger">Failed</StatusPill>;
}

export default async function ParentFeesPage({ searchParams }: { searchParams: Promise<{ child?: string; paid?: string }> }) {
  const params = await searchParams;
  const { profile, children, activeChild } = await getParentContext(params.child);

  if (!activeChild) {
    return (
      <div className="space-y-6">
        <PageHeader title="Fees" description="Ada" />
        <EmptyState kind="children" action={{ href: "/link-child", label: "Link a child" }} />
      </div>
    );
  }

  const child = activeChild;
  const supabase = await createClient();
  const [school, term] = await Promise.all([getSchoolInfo(profile.school_id, profile.school?.name ?? "Your school"), getCurrentTerm()]);
  const termLabel = term ? `${term.termNumber}${term.year ? ` ${term.year}` : ""}` : "No current term";

  const [{ summary, structure }, payments] = await Promise.all([
    getFeeSummary(supabase, { studentId: child.id, classId: child.class_id, termId: term?.id ?? null }),
    getPayments(child.id),
  ]);

  const parentName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Parent";
  const childName = `${child.first_name} ${child.last_name}`;
  const balanceTone = summary.status === "paid" ? "good" : summary.outstanding > 0 ? "warn" : "default";

  return (
    <div className="space-y-6">
      <PageHeader title="Fees" description={`Ada · ${termLabel}`} />
      <StudentPlate child={child} allChildren={children} schoolName={school.name} />

      {params.paid ? (
        <div role="status" className="flex items-center gap-2.5 rounded-lg border border-pp-green/25 bg-pp-green-tint px-4 py-3 text-[0.9375rem] font-medium text-pp-green">
          <CircleCheck size={18} aria-hidden /> Payment received — thank you!
        </div>
      ) : null}

      {summary.status === "none" && payments.length === 0 ? (
        <EmptyState kind="fees" />
      ) : (
        <>
          <Ledger cols={3}>
            <LedgerItem
              icon={Wallet}
              label={`Total fees · ${termLabel}`}
              value={formatKSh(summary.totalDue)}
              note={summary.broughtForward !== 0 ? `Includes ${formatKSh(summary.broughtForward)} brought forward` : `Term fees ${formatKSh(summary.termFees)}`}
            />
            <LedgerItem icon={Banknote} label="Paid this term" value={formatKSh(summary.paid)} tone={summary.paid > 0 ? "good" : "default"} note={`${summary.percentPaid}% of total`} />
            <LedgerItem
              icon={Receipt}
              label={summary.credit > 0 ? "Credit" : "Balance"}
              value={formatKSh(summary.credit > 0 ? summary.credit : summary.outstanding)}
              tone={balanceTone}
              aside={
                summary.status === "paid" ? <StatusPill tone="good">Fully paid</StatusPill> : summary.status === "partial" ? <StatusPill tone="warn">Part paid</StatusPill> : summary.status === "unpaid" ? <StatusPill tone="warn">Unpaid</StatusPill> : undefined
              }
              note={summary.credit > 0 ? "Overpaid — carried to next term" : summary.outstanding > 0 ? "Still to pay this term" : "Nothing owing"}
            />
          </Ledger>

          {summary.totalDue > 0 ? (
            <div className="rounded-lg border border-pp-rule bg-pp-surface px-4 py-4 sm:px-5">
              <div className="mb-2.5 flex items-baseline justify-between text-[0.8125rem] text-pp-muted">
                <span>Payment progress</span>
                <span className="pp-num font-medium text-pp-ink">{summary.percentPaid}% paid</span>
              </div>
              <ProgressBar value={summary.percentPaid} label={`${summary.percentPaid}% of fees paid`} />
              {summary.outstanding > 0 ? (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-pp-rule pt-4">
                  <p className="text-[0.875rem] text-pp-muted">
                    Pay <span className="pp-num font-semibold text-pp-ink">{formatKSh(summary.outstanding)}</span> securely with M-Pesa.
                  </p>
                  <PayFeesButton studentId={child.id} amount={summary.outstanding} />
                </div>
              ) : null}
            </div>
          ) : null}

          <FeeStructureCard className={child.className ?? ""} termLabel={termLabel} rows={structure} />

          <Panel title="Payment history" description="All payments recorded for this child" bodyClassName="p-0">
            {payments.length === 0 ? (
              <div className="p-4">
                <EmptyState kind="fees" title="No payments yet" description="Your payment history will appear here." compact />
              </div>
            ) : (
              <>
                {/* Tablet & desktop */}
                <div className="pp-scroll-x hidden sm:block">
                  <table className="w-full min-w-[40rem] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-pp-rule-strong text-[0.8125rem] text-pp-muted">
                        <th scope="col" className="px-5 py-2.5 font-medium">Date</th>
                        <th scope="col" className="px-3 py-2.5 font-medium">Description</th>
                        <th scope="col" className="px-3 py-2.5 font-medium">Receipt / reference</th>
                        <th scope="col" className="px-3 py-2.5 text-right font-medium">Amount</th>
                        <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                        <th scope="col" className="px-3 py-2.5"><span className="sr-only">Receipt</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pp-rule">
                      {payments.map((p) => (
                        <tr key={p.id} className="align-middle">
                          <td className="pp-num whitespace-nowrap px-5 py-3 text-[0.875rem] text-pp-muted">{formatDayMonth(p.date.slice(0, 10))}</td>
                          <td className="px-3 py-3 text-[0.875rem]">
                            <span className="font-medium">{p.category ?? "Fees"}</span>
                            <span className="block text-[0.8125rem] text-pp-muted">{[p.termLabel, p.method].filter(Boolean).join(" · ")}</span>
                          </td>
                          <td className="px-3 py-3 text-[0.8125rem] text-pp-muted">
                            <span className="pp-num block font-mono">{p.receiptNumber ?? "–"}</span>
                            {p.reference ? <span className="pp-num block font-mono">{p.reference}</span> : null}
                          </td>
                          <td className="pp-num whitespace-nowrap px-3 py-3 text-right text-[0.9375rem] font-semibold">{formatKSh(p.amount)}</td>
                          <td className="px-3 py-3"><StatusFor status={p.status} /></td>
                          <td className="px-3 py-3 text-right">
                            {p.status === "Confirmed" ? (
                              <ReceiptButton
                                data={{
                                  receiptNumber: p.receiptNumber,
                                  studentName: childName,
                                  admissionNumber: child.admission_number ?? "",
                                  amount: p.amount,
                                  feeCategory: p.category,
                                  paymentMethod: p.method,
                                  mpesaReference: p.reference,
                                  paymentDate: p.date.slice(0, 10),
                                  schoolName: school.name,
                                  printedBy: parentName,
                                }}
                              />
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Phones */}
                <ul className="divide-y divide-pp-rule sm:hidden">
                  {payments.map((p) => (
                    <li key={p.id} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[0.9375rem] font-medium">{p.category ?? "Fees"}</p>
                          <p className="text-[0.8125rem] text-pp-muted">
                            {[formatDayMonth(p.date.slice(0, 10)), p.termLabel, p.method].filter(Boolean).join(" · ")}
                          </p>
                          {p.receiptNumber || p.reference ? <p className="pp-num mt-0.5 font-mono text-[0.75rem] text-pp-muted">{[p.receiptNumber, p.reference].filter(Boolean).join(" · ")}</p> : null}
                        </div>
                        <p className="pp-num shrink-0 text-[0.9375rem] font-semibold">{formatKSh(p.amount)}</p>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <StatusFor status={p.status} />
                        {p.status === "Confirmed" ? (
                          <ReceiptButton
                            data={{
                              receiptNumber: p.receiptNumber,
                              studentName: childName,
                              admissionNumber: child.admission_number ?? "",
                              amount: p.amount,
                              feeCategory: p.category,
                              paymentMethod: p.method,
                              mpesaReference: p.reference,
                              paymentDate: p.date.slice(0, 10),
                              schoolName: school.name,
                              printedBy: parentName,
                            }}
                          />
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
