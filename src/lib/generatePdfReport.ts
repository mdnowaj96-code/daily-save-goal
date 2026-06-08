import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

const fmt = (n: number) => `৳${Math.round(n).toLocaleString("bn-BD")}`;
const pct = (n: number) => `${n.toLocaleString("bn-BD")}%`;

const ensureBengaliFont = async (): Promise<void> => {
  // Ensure Noto Sans Bengali (Google Fonts) is loaded before rendering.
  if (!document.getElementById("noto-bengali-pdf-font")) {
    const link = document.createElement("link");
    link.id = "noto-bengali-pdf-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }
  try {
    if ((document as any).fonts?.load) {
      await Promise.all([
        (document as any).fonts.load('400 14px "Noto Sans Bengali"'),
        (document as any).fonts.load('700 16px "Noto Sans Bengali"'),
      ]);
      await (document as any).fonts.ready;
    }
  } catch {
    // noop
  }
};

const buildReportHtml = (input: PdfReportInput): HTMLElement => {
  const wrapper = document.createElement("div");
  // A4-friendly width at 96dpi: ~794px; we render at 720 for safe margins.
  wrapper.style.cssText = [
    "position:fixed",
    "top:-10000px",
    "left:0",
    "width:720px",
    "padding:32px",
    "background:#ffffff",
    "color:#0f172a",
    'font-family:"Noto Sans Bengali", system-ui, sans-serif',
    "font-size:14px",
    "line-height:1.6",
    "box-sizing:border-box",
    "-webkit-font-smoothing:antialiased",
  ].join(";");

  const rows = [
    {
      name: "মোট বেতন",
      percent: "১০০%",
      allocated: fmt(input.salary),
      spent: "—",
      remaining: "—",
      color: "#2563eb",
    },
    {
      name: "প্রয়োজন",
      percent: pct(input.needsPercent),
      allocated: fmt(input.needsAmount),
      spent: fmt(Math.max(0, input.needsAmount - input.needsRemaining)),
      remaining: fmt(input.needsRemaining),
      color: "#db2777",
    },
    {
      name: "হাত খরচ",
      percent: pct(input.wantsPercent),
      allocated: fmt(input.wantsAmount),
      spent: fmt(Math.max(0, input.wantsAmount - input.wantsRemaining)),
      remaining: fmt(input.wantsRemaining),
      color: "#f59e0b",
    },
    {
      name: "সঞ্চয়",
      percent: pct(input.savingsPercent),
      allocated: fmt(input.savingsAmount),
      spent: fmt(Math.max(0, input.savingsAmount - input.savingsRemaining)),
      remaining: fmt(input.savingsRemaining),
      color: "#10b981",
    },
  ];

  const cellPad = "padding:10px 12px;";
  const tbody = rows
    .map(
      (r) => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="${cellPad}font-weight:600;color:${r.color};white-space:nowrap;">${r.name}</td>
        <td style="${cellPad}text-align:center;white-space:nowrap;">${r.percent}</td>
        <td style="${cellPad}text-align:right;white-space:nowrap;">${r.allocated}</td>
        <td style="${cellPad}text-align:right;white-space:nowrap;">${r.spent}</td>
        <td style="${cellPad}text-align:right;white-space:nowrap;font-weight:600;">${r.remaining}</td>
      </tr>`
    )
    .join("");

  wrapper.innerHTML = `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-size:22px;font-weight:700;color:#1e3a8a;">খরচের মাসিক রিপোর্ট</div>
      <div style="font-size:15px;color:#475569;margin-top:6px;">${input.monthLabel}</div>
    </div>

    <div style="font-size:17px;font-weight:700;color:#0f172a;margin:10px 0 12px;border-left:4px solid #2563eb;padding-left:10px;">
      খাতওয়ারি হিসাব
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#1e3a8a;color:#ffffff;">
          <th style="${cellPad}text-align:left;font-weight:700;">খাত</th>
          <th style="${cellPad}text-align:center;font-weight:700;">শতাংশ</th>
          <th style="${cellPad}text-align:right;font-weight:700;">বরাদ্দ</th>
          <th style="${cellPad}text-align:right;font-weight:700;">খরচ</th>
          <th style="${cellPad}text-align:right;font-weight:700;">অবশিষ্ট</th>
        </tr>
      </thead>
      <tbody>${tbody}</tbody>
    </table>

    <div style="margin-top:18px;padding:14px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:15px;font-weight:600;color:#991b1b;">মোট খরচ</span>
      <span style="font-size:18px;font-weight:700;color:#b91c1c;">${fmt(input.totalExpenses)}</span>
    </div>

    <div style="margin-top:24px;text-align:center;font-size:11px;color:#94a3b8;">
      তৈরি: ${new Date().toLocaleString("bn-BD")}
    </div>
  `;

  return wrapper;
};

export async function generatePdfReport(input: PdfReportInput): Promise<void> {
  await ensureBengaliFont();

  const node = buildReportHtml(input);
  document.body.appendChild(node);

  try {
    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });

    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 24;

    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const imgData = canvas.toDataURL("image/png");

    if (imgHeight <= pageHeight - margin * 2) {
      doc.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
    } else {
      // Slice into multiple pages if needed.
      const pageContentHeightPx = ((pageHeight - margin * 2) * canvas.width) / imgWidth;
      let renderedPx = 0;
      while (renderedPx < canvas.height) {
        const sliceHeightPx = Math.min(pageContentHeightPx, canvas.height - renderedPx);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(
            canvas,
            0, renderedPx, canvas.width, sliceHeightPx,
            0, 0, canvas.width, sliceHeightPx
          );
        }
        const sliceData = sliceCanvas.toDataURL("image/png");
        const sliceHeightPt = (sliceHeightPx * imgWidth) / canvas.width;
        if (renderedPx > 0) doc.addPage();
        doc.addImage(sliceData, "PNG", margin, margin, imgWidth, sliceHeightPt);
        renderedPx += sliceHeightPx;
      }
    }

    doc.save(`khoroch-report-${input.monthKey}.pdf`);
  } finally {
    document.body.removeChild(node);
  }
}