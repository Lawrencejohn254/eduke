/**
 * Parent-portal money formatting: "KSh 10,000" (whole shillings), with cents only when present.
 * Staff screens and receipts keep using formatKES() from lib/format — this is display-only.
 */
export function formatKSh(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  const hasCents = Math.abs(value % 1) > 0.004;
  const text = Math.abs(value).toLocaleString("en-KE", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });
  return `${value < 0 ? "-" : ""}KSh ${text}`;
}
