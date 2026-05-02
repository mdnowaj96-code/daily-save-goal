import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { notoSansBengaliBase64 } from "@/assets/fonts/notoSansBengali";

export interface PdfExpense {
  date: string;
  description: string;
  amount: number;
}

export interface PdfReportInput {
  monthLabel: string;
  monthKey: string; // YYYY-MM
  salary: number;
  needsPercent: number;
  wantsPercent: number;
  savingsPercent: number;
  needsAmount: number;
  wantsAmount: number;
  savingsAmount: number;
  needsRemaining: number;
  wantsRemaining: number;
  savingsRemaining: number;
  totalExpenses: number;
  expenses: PdfExpense[];
}

const FONT_NAME = "NotoSansBengali";
const FONT_FILE = "NotoSansBengali.ttf";

let fontRegistered = false;
const ensureFont = (doc: jsPDF) => {
  // jsPDF instances are fresh; we register on each instance
  doc.addFileToVFS(FONT_FILE, notoSansBengaliBase64);
  doc.addFont(FONT_FILE, FONT_NAME, "normal");
  doc.addFont(FONT_FILE, FONT_NAME, "bold");
  doc.setFont(FONT_NAME, "normal");
  fontRegistered = true;
};

const fmt = (n: number) => `৳${Math.round(n).toLocaleString("bn-BD")}`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" });

export function generatePdfReport(input: PdfReportInput): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  ensureFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Header
  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(18);
  doc.text("খরচের মাসিক রিপোর্ট", pageWidth / 2, y, { align: "center" });
  y += 24;

  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(12);
  doc.text(input.monthLabel, pageWidth / 2, y, { align: "center" });
  y += 20;

  // Summary block
  doc.setDrawColor(220);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(13);
  doc.text("সারাংশ", margin, y);
  y += 6;

  // Summary table
  autoTable(doc, {
    startY: y + 4,
    margin: { left: margin, right: margin },
    styles: { font: FONT_NAME, fontSize: 10, cellPadding: 6 },
    headStyles: { font: FONT_NAME, fontStyle: "bold", fillColor: [30, 90, 160], textColor: 255 },
    bodyStyles: { font: FONT_NAME },
    head: [["খাত", "শতাংশ", "বরাদ্দ", "অবশিষ্ট"]],
    body: [
      ["মোট বেতন", "১০০%", fmt(input.salary), "—"],
      [
        "প্রয়োজন",
        `${input.needsPercent.toLocaleString("bn-BD")}%`,
        fmt(input.needsAmount),
        fmt(input.needsRemaining),
      ],
      [
        "ইচ্ছা",
        `${input.wantsPercent.toLocaleString("bn-BD")}%`,
        fmt(input.wantsAmount),
        fmt(input.wantsRemaining),
      ],
      [
        "সঞ্চয়",
        `${input.savingsPercent.toLocaleString("bn-BD")}%`,
        fmt(input.savingsAmount),
        fmt(input.savingsRemaining),
      ],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 16;

  // Total expenses highlight
  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(12);
  doc.setTextColor(180, 30, 30);
  doc.text(`মোট খরচ: ${fmt(input.totalExpenses)}`, margin, y);
  doc.setTextColor(0);
  y += 18;

  // Expense list
  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(13);
  doc.text("খরচের তালিকা", margin, y);
  y += 4;

  if (input.expenses.length === 0) {
    doc.setFont(FONT_NAME, "normal");
    doc.setFontSize(10);
    doc.text("এই মাসে কোনো খরচ নেই।", margin, y + 16);
  } else {
    const sorted = [...input.expenses].sort((a, b) => a.date.localeCompare(b.date));
    autoTable(doc, {
      startY: y + 6,
      margin: { left: margin, right: margin },
      styles: { font: FONT_NAME, fontSize: 10, cellPadding: 5 },
      headStyles: { font: FONT_NAME, fontStyle: "bold", fillColor: [30, 90, 160], textColor: 255 },
      bodyStyles: { font: FONT_NAME },
      head: [["তারিখ", "বিবরণ", "পরিমাণ"]],
      body: sorted.map((e) => [fmtDate(e.date), e.description, fmt(e.amount)]),
      columnStyles: {
        0: { cellWidth: 130 },
        2: { halign: "right", cellWidth: 90 },
      },
      foot: [["", "মোট", fmt(input.totalExpenses)]],
      footStyles: { font: FONT_NAME, fontStyle: "bold", fillColor: [240, 240, 240], textColor: 0, halign: "right" },
    });
  }

  // Footer with timestamp
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont(FONT_NAME, "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    const stamp = `তৈরি: ${new Date().toLocaleString("bn-BD")}  |  পৃষ্ঠা ${i.toLocaleString("bn-BD")} / ${pageCount.toLocaleString("bn-BD")}`;
    doc.text(stamp, pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: "center" });
  }

  doc.save(`khoroch-report-${input.monthKey}.pdf`);
}