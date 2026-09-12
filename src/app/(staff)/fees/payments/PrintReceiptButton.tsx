"use client";

import { Printer } from "lucide-react";

type ReceiptData = {
  receiptNumber: string | null;
  studentName: string;
  admissionNumber: string;
  amount: number;
  feeCategory: string | null;
  paymentMethod: string | null;
  mpesaReference?: string | null;
  paymentDate: string | null;
  schoolName: string;
  printedBy: string;
};

function esc(value: string | number | null | undefined) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export default function PrintReceiptButton({ data }: { data: ReceiptData }) {
  function handlePrint() {
    const win = window.open("", "_blank", "width=420,height=640");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Receipt ${esc(data.receiptNumber)}</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 28px; color: #111; }
            h1 { font-size: 17px; margin: 0 0 2px; }
            .muted { color: #666; font-size: 12px; margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 6px 0; font-size: 13px; vertical-align: top; }
            td.label { color: #666; width: 40%; }
            td.value { text-align: right; font-weight: 600; }
            .total-row td { border-top: 1px solid #ccc; padding-top: 10px; margin-top: 4px; font-size: 15px; }
            .footer { margin-top: 28px; font-size: 11px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <h1>${esc(data.schoolName)}</h1>
          <p class="muted">Official Fee Payment Receipt</p>
          <table>
            <tr><td class="label">Receipt No.</td><td class="value">${esc(data.receiptNumber) || "-"}</td></tr>
            <tr><td class="label">Student</td><td class="value">${esc(data.studentName)} (${esc(data.admissionNumber)})</td></tr>
            <tr><td class="label">Fee Category</td><td class="value">${esc(data.feeCategory) || "-"}</td></tr>
            <tr><td class="label">Payment Method</td><td class="value">${esc(data.paymentMethod) || "-"}</td></tr>
            ${data.mpesaReference ? `<tr><td class="label">M-Pesa Ref</td><td class="value">${esc(data.mpesaReference)}</td></tr>` : ""}
            <tr><td class="label">Date</td><td class="value">${esc(data.paymentDate) || "-"}</td></tr>
            <tr class="total-row"><td class="label">Amount Paid</td><td class="value">KES ${data.amount.toLocaleString()}</td></tr>
          </table>
          <p class="footer">Printed by ${esc(data.printedBy)} · ${esc(new Date().toLocaleString())}</p>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <button onClick={handlePrint} className="flex items-center gap-1 text-xs text-eduke-green hover:underline">
      <Printer size={13} /> Print
    </button>
  );
}