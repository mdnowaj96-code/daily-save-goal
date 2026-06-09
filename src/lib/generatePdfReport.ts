import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface PdfExpense {
  date: string;
  description: string;
  amount: number;
}

export interface PdfReportInput {
  view: "daily" | "category";
  monthLabel: string;
  monthKey: string; // YYYY-MM
  expenses: PdfExpense[];
}

const fmt = (n: number) => `৳${Math.round(n).toLocaleString("bn-BD")}`;
const toBnDigits = (s: string | number) =>
  String(s).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const BN_MONTHS_FULL = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

const formatBnDate = (iso: string) => {
  // iso: YYYY-MM-DD
  const [, mo, d] = iso.split("-");
  const monthName = BN_MONTHS_FULL[parseInt(mo, 10) - 1] ?? mo;
  return `${toBnDigits(parseInt(d, 10))} ${monthName}`;
};

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
        (document as any).fonts.load('500 14px "Noto Sans Bengali"'),
        (document as any).fonts.load('600 14px "Noto Sans Bengali"'),
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

  const cellPad = "padding:10px 12px;";
  const total = input.expenses.reduce((s, e) => s + e.amount, 0);

  let sectionTitle = "";
  let tableHtml = "";

  if (input.view === "daily") {
    sectionTitle = "দৈনিক খরচের তালিকা";
    const sorted = [...input.expenses].sort((a, b) => a.date.localeCompare(b.date));
    const tbody = sorted
      .map(
        (e, idx) => `
        <tr style="border-bottom:1px solid #e5e7eb;background:${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
          <td style="${cellPad}white-space:nowrap;color:#475569;">${formatBnDate(e.date)}</td>
          <td style="${cellPad}word-break:break-word;">${e.description}</td>
          <td style="${cellPad}text-align:right;white-space:nowrap;font-weight:600;">${fmt(e.amount)}</td>
        </tr>`
      )
      .join("");
    tableHtml = `
      <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;table-layout:fixed;">
        <colgroup>
          <col style="width:22%" />
          <col style="width:53%" />
          <col style="width:25%" />
        </colgroup>
        <thead>
          <tr style="background:#1e3a8a;color:#ffffff;">
            <th style="${cellPad}text-align:left;font-weight:700;">তারিখ</th>
            <th style="${cellPad}text-align:left;font-weight:700;">বিবরণ</th>
            <th style="${cellPad}text-align:right;font-weight:700;">পরিমাণ</th>
          </tr>
        </thead>
        <tbody>${tbody || `<tr><td colspan="3" style="${cellPad}text-align:center;color:#64748b;">কোনো খরচ নেই</td></tr>`}</tbody>
      </table>`;
  } else {
    sectionTitle = "খাতওয়ারি খরচের তালিকা";
    const cats: Record<string, { name: string; value: number }> = {};
    input.expenses.forEach((e) => {
      const normalized = e.description.trim().replace(/\s+/g, " ");
      const key = normalized.toLowerCase();
      if (!cats[key]) cats[key] = { name: normalized, value: 0 };
      cats[key].value += e.amount;
    });
    const list = Object.values(cats).sort((a, b) => b.value - a.value);
    const tbody = list
      .map((c, idx) => {
        const pctNum = total > 0 ? (c.value / total) * 100 : 0;
        const pctStr = `${toBnDigits(pctNum.toFixed(1))}%`;
        return `
        <tr style="border-bottom:1px solid #e5e7eb;background:${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
          <td style="${cellPad}word-break:break-word;">${c.name}</td>
          <td style="${cellPad}text-align:center;white-space:nowrap;color:#475569;">${pctStr}</td>
          <td style="${cellPad}text-align:right;white-space:nowrap;font-weight:600;">${fmt(c.value)}</td>
        </tr>`;
      })
      .join("");
    tableHtml = `
      <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;table-layout:fixed;">
        <colgroup>
          <col style="width:55%" />
          <col style="width:20%" />
          <col style="width:25%" />
        </colgroup>
        <thead>
          <tr style="background:#1e3a8a;color:#ffffff;">
            <th style="${cellPad}text-align:left;font-weight:700;">খাত</th>
            <th style="${cellPad}text-align:center;font-weight:700;">শতাংশ</th>
            <th style="${cellPad}text-align:right;font-weight:700;">পরিমাণ</th>
          </tr>
        </thead>
        <tbody>${tbody || `<tr><td colspan="3" style="${cellPad}text-align:center;color:#64748b;">কোনো খরচ নেই</td></tr>`}</tbody>
      </table>`;
  }

  wrapper.innerHTML = `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-size:22px;font-weight:700;color:#1e3a8a;">খরচের মাসিক রিপোর্ট</div>
      <div style="font-size:15px;color:#475569;margin-top:6px;">${input.monthLabel}</div>
    </div>

    <div style="font-size:17px;font-weight:700;color:#0f172a;margin:10px 0 12px;border-left:4px solid #2563eb;padding-left:10px;">
      ${sectionTitle}
    </div>

    ${tableHtml}

    <div style="margin-top:18px;padding:14px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:15px;font-weight:600;color:#991b1b;">মোট খরচ</span>
      <span style="font-size:18px;font-weight:700;color:#b91c1c;">${fmt(total)}</span>
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