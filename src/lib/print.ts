export function printAsPDF(title: string, bodyText: string) {
  const win = window.open("", "_blank", "width=800,height=1000");
  if (!win) return;

  const escaped = bodyText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; padding: 32px; color: #1a1a1a; }
          h1 { color: #1b5e20; font-size: 18px; margin-bottom: 4px; }
          pre { white-space: pre-wrap; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <pre>${escaped}</pre>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  win.document.close();
}

const DOCUMENT_STYLE = `
  body { font-family: Arial, Helvetica, sans-serif; padding: 32px; color: #1a1a1a; max-width: 700px; margin: 0 auto; background: #ffffff; }
  h1 { color: #1b5e20; font-size: 20px; margin-bottom: 2px; }
  .subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #1b5e20; color: #ffffff; text-align: left; padding: 8px 12px; font-size: 13px; }
  th.amount, td.amount { text-align: right; }
  td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
  tbody tr:nth-child(even) td { background: #f9fafb; }
  tfoot td { font-weight: bold; border-top: 2px solid #1b5e20; font-size: 14px; padding: 10px 12px; }
  .footer { margin-top: 24px; font-size: 11px; color: #999; }
`;

function wrapDocument(title: string, htmlBody: string, includePrintScript: boolean) {
  const printScript = includePrintScript ? '<script>window.onload = () => window.print();</script>' : "";
  return `
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <style>${DOCUMENT_STYLE}</style>
      </head>
      <body>
        ${htmlBody}
        ${printScript}
      </body>
    </html>
  `;
}

// Opens a new tab with a styled HTML document and triggers the browser's print dialog
// (from which the person can choose "Save as PDF" or print physically).
export function printHtmlDocument(title: string, htmlBody: string) {
  const win = window.open("", "_blank", "width=800,height=1000");
  if (!win) return;
  win.document.write(wrapDocument(title, htmlBody, true));
  win.document.close();
}

// Renders the given HTML into an offscreen element, rasterizes it with html2canvas, then embeds
// that image into a real PDF file via jsPDF and triggers an actual browser download — no dialog,
// no "Save as..." step, and the resulting file is genuinely a .pdf, not an .html page.
export async function downloadHtmlAsPdf(filename: string, htmlBody: string): Promise<void> {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "700px";
  container.style.background = "#ffffff";
  container.innerHTML = `<style>${DOCUMENT_STYLE}</style>${htmlBody}`;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { backgroundColor: "#ffffff", scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= pageHeight - margin * 2) {
      pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
    } else {
      // Content taller than one page: slice the canvas across multiple pages.
      const pageCanvasHeight = ((pageHeight - margin * 2) * canvas.width) / imgWidth;
      let renderedHeight = 0;
      let firstPage = true;
      while (renderedHeight < canvas.height) {
        const sliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedHeight);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext("2d");
        ctx?.drawImage(canvas, 0, renderedHeight, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        const sliceData = sliceCanvas.toDataURL("image/png");
        const sliceImgHeight = (sliceHeight * imgWidth) / canvas.width;
        if (!firstPage) pdf.addPage();
        pdf.addImage(sliceData, "PNG", margin, margin, imgWidth, sliceImgHeight);
        renderedHeight += sliceHeight;
        firstPage = false;
      }
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

export type FeeStructureRow = { category: string; amount: number; mandatory: boolean; description?: string | null };

// Shared builder so the staff-side and parent-side fee structure documents look identical.
export function buildFeeStructureTableHtml(input: {
  schoolName?: string;
  className: string;
  termLabel: string;
  rows: FeeStructureRow[];
}): string {
  const total = input.rows.reduce((sum, r) => sum + r.amount, 0);
  const rowsHtml = input.rows
    .map(
      (r) => `
        <tr>
          <td>${r.category}${r.mandatory ? "" : " <em>(optional)</em>"}</td>
          <td>${r.description ?? ""}</td>
          <td class="amount">KES ${r.amount.toLocaleString()}</td>
        </tr>`
    )
    .join("");

  return `
    <h1>${input.schoolName ?? "EduKe"} — Fee Structure</h1>
    <p class="subtitle">${input.className} · ${input.termLabel}</p>
    <table>
      <thead>
        <tr><th>Category</th><th>Description</th><th class="amount">Amount</th></tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr><td colspan="2">TOTAL</td><td class="amount">KES ${total.toLocaleString()}</td></tr>
      </tfoot>
    </table>
    <p class="footer">Generated on ${new Date().toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })} via EduKe.</p>
  `;
}