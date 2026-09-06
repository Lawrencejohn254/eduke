"use client";

import { useMemo, useState } from "react";
import { formatKES } from "@/lib/format";
import { MessageSquare, Loader2, Download } from "lucide-react";

type Balance = {
  id: string;
  name: string;
  admission: string;
  className: string;
  expected: number;
  broughtForward: number;
  paid: number;
  balance: number;
  phone: string | null;
};

type StatusFilter = "all" | "defaulters" | "paid";

export default function DefaultersClient({ balances }: { balances: Balance[] }) {
  const [status, setStatus] = useState<StatusFilter>("defaulters");
  const [minBalance, setMinBalance] = useState("");
  const [maxBalance, setMaxBalance] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return balances.filter((b) => {
      if (status === "defaulters" && b.balance <= 0) return false;
      if (status === "paid" && b.balance > 0) return false;

      const min = minBalance.trim() ? Number(minBalance) : null;
      const max = maxBalance.trim() ? Number(maxBalance) : null;
      // Range filters apply to the absolute balance owed, so "5000 to 10000" works intuitively
      // whether checking defaulters (positive balance) or overpayments (negative balance shown as credit).
      const compareValue = status === "paid" ? Math.abs(b.balance) : b.balance;
      if (min !== null && compareValue < min) return false;
      if (max !== null && compareValue > max) return false;
      return true;
    });
  }, [balances, status, minBalance, maxBalance]);

  const totalShown = filtered.reduce((s, b) => s + b.balance, 0);

  async function sendReminder(b: Balance) {
    if (!b.phone) return;
    setSending(b.id);
    await fetch("/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientPhones: [b.phone],
        message: `EduKe: Dear parent/guardian, ${b.name} (${b.admission}) has an outstanding fee balance of KES ${b.balance.toLocaleString()}. Kindly clear the balance at your earliest convenience. Thank you.`,
      }),
    });
    setSending(null);
    setSentIds((prev) => new Set(prev).add(b.id));
  }

  async function handleExport() {
    const XLSX = await import("xlsx");
    const rows = filtered.map((b) => ({
      "Admission No.": b.admission,
      "Student Name": b.name,
      "Class": b.className,
      "Expected (KES)": b.expected,
      "Brought Forward (KES)": b.broughtForward,
      "Paid (KES)": b.paid,
      "Balance (KES)": b.balance,
      "Status": b.balance > 0 ? "Owing" : b.balance < 0 ? "Overpaid" : "Fully Paid",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fee Balances");
    const label = status === "defaulters" ? "defaulters" : status === "paid" ? "paid-overpaid" : "all";
    XLSX.writeFile(wb, `fee-balances-${label}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="block mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="defaulters">Defaulters (owing)</option>
              <option value="paid">Fully paid / overpaid</option>
              <option value="all">All students</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">
              {status === "paid" ? "Min credit (KES)" : "Min balance (KES)"}
            </label>
            <input
              type="number"
              min={0}
              value={minBalance}
              onChange={(e) => setMinBalance(e.target.value)}
              placeholder="e.g. 5000"
              className="block mt-1 w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">
              {status === "paid" ? "Max credit (KES)" : "Max balance (KES)"}
            </label>
            <input
              type="number"
              min={0}
              value={maxBalance}
              onChange={(e) => setMaxBalance(e.target.value)}
              placeholder="e.g. 10000"
              className="block mt-1 w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-50"
          >
            <Download size={15} /> Export to Excel
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          {filtered.length} student(s) shown · Total: <strong className={totalShown > 0 ? "text-red-600" : "text-eduke-green"}>{formatKES(totalShown)}</strong>
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-10 text-center">
          No students match this filter.
        </p>
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Admission No.</th>
                <th className="p-3">Student</th>
                <th className="p-3">Class</th>
                <th className="p-3">Balance</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs text-gray-600">{b.admission}</td>
                  <td className="p-3 font-medium text-gray-900">{b.name}</td>
                  <td className="p-3 text-gray-600">{b.className}</td>
                  <td className={`p-3 font-semibold ${b.balance > 0 ? "text-red-600" : b.balance < 0 ? "text-eduke-green" : "text-gray-600"}`}>
                    {b.balance < 0 ? `Overpaid ${formatKES(Math.abs(b.balance))}` : formatKES(b.balance)}
                  </td>
                  <td className="p-3">
                    {b.balance > 0 && (
                      <button
                        onClick={() => sendReminder(b)}
                        disabled={!b.phone || sending === b.id}
                        className="flex items-center gap-1.5 text-xs font-medium text-eduke-green hover:underline disabled:opacity-40 disabled:no-underline"
                      >
                        {sending === b.id ? <Loader2 size={13} className="animate-spin" /> : <MessageSquare size={13} />}
                        {sentIds.has(b.id) ? "Reminder sent" : "Send SMS reminder"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}