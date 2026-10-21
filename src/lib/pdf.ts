import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Report } from "./report";

async function fontBase64(url: string) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error("PDF font could not be loaded. Please retry.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
let fonts: Promise<string[]> | null = null;
export async function exportPdf(reports: Report[]) {
  if (!reports.length || reports.some((r) => r.blocked))
    throw new Error("Fix invalid inputs before exporting.");
  fonts ??= Promise.all([
    fontBase64("/fonts/DejaVuSans.ttf"),
    fontBase64("/fonts/DejaVuSans-Bold.ttf"),
  ]).catch((e) => {
    fonts = null;
    throw e;
  });
  const [normal, bold] = await fonts;
  const doc = new jsPDF({
    orientation: reports.length > 1 ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
    putOnlyUsedFonts: true,
  });
  doc.addFileToVFS("DejaVuSans.ttf", normal);
  doc.addFont("DejaVuSans.ttf", "Unicode", "normal");
  doc.addFileToVFS("DejaVuSans-Bold.ttf", bold);
  doc.addFont("DejaVuSans-Bold.ttf", "Unicode", "bold");
  const width = doc.internal.pageSize.getWidth(),
    height = doc.internal.pageSize.getHeight();
  let y = 20;
  const text = (value: string, size = 9, strong = false) => {
    doc.setFont("Unicode", strong ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(value, width - 28);
    for (const line of lines) {
      if (y > height - 20) {
        doc.addPage();
        y = 18;
      }
      doc.text(line, 14, y);
      y += size * 0.45 + 1;
    }
    y += 2;
  };
  if (reports.length > 1) {
    text("Fundraise · Scenario comparison", 20, true);
    text(
      "One report date. Each scenario retains its own currency and revision.",
    );
    if (new Set(reports.map((r) => r.currency)).size > 1)
      text(
        "Mixed currencies: amounts are not converted, summed or subtracted.",
      );
  }
  for (const [i, r] of reports.entries()) {
    if (i > 0) {
      doc.addPage();
      y = 20;
    }
    text("Fundraise", 22, true);
    text(r.name, 17, true);
    text(`${r.company} · ${r.currency} · ${r.revision}`);
    text(`Report: ${r.createdAt} · Engine ${r.engineVersion}`);
    for (const s of r.sections) {
      if (y > height - 45) {
        doc.addPage();
        y = 18;
      }
      text(s.title, 12, true);
      const table = (headers: string[], rows: string[][]) => {
        autoTable(doc, {
          startY: y,
          head: [headers],
          body: rows,
          theme: "striped",
          styles: {
            font: "Unicode",
            fontSize: 7,
            cellPadding: 2.5,
            overflow: "linebreak",
          },
          headStyles: {
            fillColor: [91, 33, 182],
            font: "Unicode",
            fontStyle: "bold",
          },
          margin: { left: 14, right: 14, top: 16, bottom: 18 },
          showHead: "everyPage",
          rowPageBreak: "avoid",
        });
        y =
          (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
            .finalY + 7;
      };
      if (s.rows.length)
        table(
          ["Metric", "Value / units", "Provenance / status", "Note"],
          s.rows.map((v) => [
            v.label,
            `${v.display}\n${v.unit}`,
            `${v.provenance} · ${v.status}`,
            v.note,
          ]),
        );
      for (const t of s.tables) {
        text(t.title, 9, true);
        table(t.headers, t.rows);
      }
      for (const formula of s.formulas) text(formula, 8);
    }
    text("Assumptions & exclusions", 12, true);
    for (const warning of r.warnings) text(warning, 8);
  }
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("Unicode", "normal");
    doc.setFontSize(8);
    doc.setTextColor(105);
    doc.text(
      `Fundraise · Planning report · Page ${p} of ${pages}`,
      14,
      height - 8,
    );
  }
  doc.save(
    reports.length > 1 ? "fundraise-comparison.pdf" : "fundraise-report.pdf",
  );
}
