import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  loadLogo,
  drawStyledFooter,
  addWatermark,
  primaryColor,
  goldColor,
  darkColor,
  grayColor,
} from "./pdfDesignUtils";

const MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];

export interface FeeCardData {
  studentId: string;
  studentName: string;
  fatherName: string;
  className: string;
  section?: string;
  session: string;
  photoUrl?: string;
  address?: string;
  feeRecords: {
    feeType: string;
    monthlyData: Record<string, { amount: number; paid: number }>;
  }[];
  totals: {
    total: number;
    discount: number;
    netTotal: number;
    paid: number;
    balance: number;
  };
  dueDate: string;
}

export const generateFeeCardPdf = async (data: FeeCardData): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Load logo
  const logoImg = await loadLogo();

  // Add watermark
  await addWatermark(doc, 0.04);

  // Header background with gradient effect
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 48, "F");

  // Gold accent stripe
  doc.setFillColor(...goldColor);
  doc.rect(0, 48, pageWidth, 3, "F");

  // Decorative circles in header
  doc.setFillColor(255, 255, 255);
  doc.circle(pageWidth - 30, 15, 40, "F");
  doc.circle(pageWidth - 70, -15, 30, "F");
  doc.circle(35, 40, 25, "F");

  // Logo with gold ring
  if (logoImg) {
    const logoSize = 36;
    const logoX = 12;
    const logoY = 6;

    // Gold ring
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(2.5);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 4);

    // White background
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 1, "F");

    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }

  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("The Suffah Public School & College", pageWidth / 2, 16, { align: "center" });

  // Address
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Madyan Swat, Pakistan", pageWidth / 2, 24, { align: "center" });

  // Fee Card Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("STUDENT FEE CARD", pageWidth / 2, 34, { align: "center" });

  // Session
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Session: ${data.session}`, pageWidth / 2, 42, { align: "center" });

  // Student Info Card
  const infoY = 56;
  doc.setFillColor(250, 252, 255);
  doc.roundedRect(10, infoY, pageWidth - 20, 28, 3, 3, "F");
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(10, infoY, pageWidth - 20, 28, 3, 3, "S");

  // Student details - Column 1
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.setFont("helvetica", "normal");
  doc.text("Student ID:", 16, infoY + 8);
  doc.text("Student Name:", 16, infoY + 16);
  doc.text("Class:", 16, infoY + 24);

  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "bold");
  doc.text(data.studentId, 48, infoY + 8);
  doc.text(data.studentName, 48, infoY + 16);
  doc.text(`${data.className}${data.section ? ` - ${data.section}` : ""}`, 48, infoY + 24);

  // Student details - Column 2
  doc.setTextColor(...grayColor);
  doc.setFont("helvetica", "normal");
  doc.text("Father Name:", 120, infoY + 8);
  doc.text("Address:", 120, infoY + 16);
  doc.text("Due Date:", 120, infoY + 24);

  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "bold");
  doc.text(data.fatherName || "N/A", 152, infoY + 8);
  doc.setFont("helvetica", "normal");
  doc.text(data.address || "N/A", 152, infoY + 16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(data.dueDate, 152, infoY + 24);

  // Status badge
  const statusX = pageWidth - 55;
  const statusY = infoY + 6;
  const isFullyPaid = data.totals.balance <= 0;

  doc.setFillColor(isFullyPaid ? 34 : 234, isFullyPaid ? 139 : 179, isFullyPaid ? 34 : 8);
  doc.roundedRect(statusX, statusY, 40, 14, 7, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(isFullyPaid ? "FULLY PAID" : "BALANCE DUE", statusX + 20, statusY + 9, { align: "center" });

  // Prepare table data with monthly breakdown
  const tableHeaders = [
    "S.No",
    "Fee Type",
    ...MONTHS.map((m) => m),
    "Total",
    "Paid",
  ];

  const tableData = data.feeRecords.map((record, index) => {
    let rowTotal = 0;
    let rowPaid = 0;
    const monthCells = MONTHS.map((month) => {
      const monthData = record.monthlyData[month] || { amount: 0, paid: 0 };
      rowTotal += monthData.amount;
      rowPaid += monthData.paid;
      if (monthData.amount === 0) return "-";
      return monthData.paid >= monthData.amount ? `✓ ${monthData.amount}` : monthData.amount.toString();
    });

    return [
      (index + 1).toString(),
      record.feeType,
      ...monthCells,
      rowTotal.toLocaleString(),
      rowPaid.toLocaleString(),
    ];
  });

  // Add totals row
  const monthTotals = MONTHS.map((month) => {
    const total = data.feeRecords.reduce((sum, record) => {
      return sum + (record.monthlyData[month]?.amount || 0);
    }, 0);
    return total > 0 ? total.toLocaleString() : "-";
  });

  tableData.push([
    "",
    "TOTAL",
    ...monthTotals,
    data.totals.total.toLocaleString(),
    data.totals.paid.toLocaleString(),
  ]);

  // Generate table
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: 88,
    margin: { left: 10, right: 10 },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      halign: "center",
      valign: "middle",
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 255],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 28, halign: "left" },
      14: { fontStyle: "bold" },
      15: { fontStyle: "bold", textColor: primaryColor },
    },
    didParseCell: (data) => {
      // Last row styling
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fillColor = [235, 245, 255];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = primaryColor;
      }
      // Checkmark cells (paid months)
      if (typeof data.cell.text[0] === "string" && data.cell.text[0].startsWith("✓")) {
        data.cell.styles.textColor = [34, 139, 34];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Summary section
  doc.setFillColor(250, 252, 255);
  doc.roundedRect(pageWidth - 85, finalY, 75, 42, 3, 3, "F");
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1);
  doc.roundedRect(pageWidth - 85, finalY, 75, 42, 3, 3, "S");

  // Summary header
  doc.setFillColor(...primaryColor);
  doc.roundedRect(pageWidth - 85, finalY, 75, 8, 3, 3, "F");
  doc.rect(pageWidth - 85, finalY + 5, 75, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT SUMMARY", pageWidth - 47.5, finalY + 6, { align: "center" });

  // Summary details
  let summaryY = finalY + 14;
  const summaryItems = [
    { label: "Total Amount:", value: `PKR ${data.totals.total.toLocaleString()}` },
    { label: "Discount:", value: `PKR ${data.totals.discount.toLocaleString()}` },
    { label: "Net Total:", value: `PKR ${data.totals.netTotal.toLocaleString()}` },
    { label: "Amount Paid:", value: `PKR ${data.totals.paid.toLocaleString()}`, color: [34, 139, 34] },
    { label: "Balance Due:", value: `PKR ${data.totals.balance.toLocaleString()}`, color: data.totals.balance > 0 ? [220, 53, 69] : [34, 139, 34] },
  ];

  summaryItems.forEach((item, i) => {
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, pageWidth - 80, summaryY);
    
    doc.setTextColor(...(item.color || darkColor) as [number, number, number]);
    doc.setFont("helvetica", i === summaryItems.length - 1 ? "bold" : "normal");
    doc.text(item.value, pageWidth - 15, summaryY, { align: "right" });
    summaryY += 6;
  });

  // Notes section
  doc.setFillColor(255, 250, 240);
  doc.roundedRect(10, finalY, 110, 42, 3, 3, "F");
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(10, finalY, 110, 42, 3, 3, "S");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("Important Notes:", 15, finalY + 8);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  const notes = [
    "• Fees must be paid by the 10th of each month.",
    "• Late fee of PKR 100 will be charged after due date.",
    "• Cheques should be in favor of 'The Suffah Public School'.",
    "• Keep this fee card for your records.",
    "• ✓ indicates paid months.",
  ];
  notes.forEach((note, i) => {
    doc.text(note, 15, finalY + 15 + i * 5);
  });

  // Footer
  drawStyledFooter(doc, 1, 1, "Madyan Swat, Pakistan");

  return doc;
};

export const downloadFeeCard = async (data: FeeCardData): Promise<void> => {
  const doc = await generateFeeCardPdf(data);
  doc.save(`FeeCard-${data.studentId}-${data.session.replace(/\s+/g, "_")}.pdf`);
};

export const printFeeCard = async (data: FeeCardData): Promise<void> => {
  const doc = await generateFeeCardPdf(data);
  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(pdfUrl, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};
