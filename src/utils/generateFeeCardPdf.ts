import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadLogo, primaryColor, goldColor, darkColor, grayColor } from "./pdfDesignUtils";

// Academic year months order (Sep to Aug)
const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

export interface FeeCardData {
  studentId: string;
  studentName: string;
  fatherName: string;
  className: string;
  section?: string;
  session: string;
  feeType: string; // e.g., "Transport Fee", "Tuition Fee"
  monthlyAmount: number; // Fixed monthly amount
  annualTotal: number;
  monthlyData: Record<string, { arrears: number; totalAmount: number; adjustment: number; paid: number; balance: number }>;
  totals: {
    arrears: number;
    totalPayables: number;
    adjustment: number;
    paid: number;
    balance: number;
  };
  dueDate: string;
  feeOfMonth: string;
}

const drawWhiteCircles = (doc: jsPDF, headerHeight: number): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // White semi-transparent circles in header
  doc.setFillColor(255, 255, 255);
  doc.circle(pageWidth - 28, 18, 38, 'F');
  doc.circle(pageWidth - 65, -12, 28, 'F');
  doc.circle(32, 38, 22, 'F');
  doc.circle(pageWidth - 35, 45, 15, 'F');
};

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

  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 42, "F");

  // Gold accent stripe
  doc.setFillColor(...goldColor);
  doc.rect(0, 42, pageWidth, 2, "F");

  // White circular decorations
  drawWhiteCircles(doc, 42);

  // Left logo with gold ring
  if (logoImg) {
    const logoSize = 32;
    const logoX = 8;
    const logoY = 5;

    doc.setDrawColor(...goldColor);
    doc.setLineWidth(2);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 3);
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 1, "F");
    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }

  // Right logo with gold ring
  if (logoImg) {
    const logoSize = 32;
    const logoX = pageWidth - logoSize - 8;
    const logoY = 5;

    doc.setDrawColor(...goldColor);
    doc.setLineWidth(2);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 3);
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 1, "F");
    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }

  // School name - stylized
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("The Suffah", pageWidth / 2 - 20, 18, { align: "center" });
  
  doc.setFontSize(14);
  doc.text("Public School & College Madyan", pageWidth / 2, 28, { align: "center" });

  // Registration numbers
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("PSRA Reg. No. 200445000302", pageWidth / 2 - 40, 35);
  doc.text("BISE Reg. No. 434-B/Swat-C", pageWidth / 2 + 10, 35);

  // Content area starts
  const contentY = 48;
  
  // Left section - Student Info
  const leftSectionX = 8;
  const leftSectionWidth = 70;
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(leftSectionX, contentY, leftSectionWidth, 45);

  doc.setFontSize(9);
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "normal");
  
  let infoY = contentY + 7;
  doc.text("Student-ID:", leftSectionX + 3, infoY);
  doc.setFont("helvetica", "bold");
  doc.text(data.studentId, leftSectionX + 35, infoY);
  
  infoY += 7;
  doc.setFont("helvetica", "normal");
  doc.text("Student's-Name:", leftSectionX + 3, infoY);
  doc.setFont("helvetica", "bold");
  doc.text(data.studentName, leftSectionX + 35, infoY);
  
  infoY += 7;
  doc.setFont("helvetica", "normal");
  doc.text("Student's-Father Name:", leftSectionX + 3, infoY);
  doc.setFont("helvetica", "bold");
  doc.text(data.fatherName || "N/A", leftSectionX + 45, infoY);
  
  infoY += 7;
  doc.setFont("helvetica", "normal");
  doc.text("Session:", leftSectionX + 3, infoY);
  doc.setFont("helvetica", "bold");
  doc.text(data.session, leftSectionX + 35, infoY);

  // Middle section - Class info
  const midInfoX = leftSectionX + leftSectionWidth + 3;
  const midInfoWidth = 55;
  
  doc.setDrawColor(0, 0, 0);
  doc.rect(midInfoX, contentY, midInfoWidth, 45);

  infoY = contentY + 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Class:", midInfoX + 3, infoY);
  doc.setFont("helvetica", "bold");
  doc.text(data.className, midInfoX + 20, infoY);
  
  infoY += 7;
  doc.setFont("helvetica", "normal");
  doc.text("Section:", midInfoX + 3, infoY);
  doc.setFont("helvetica", "bold");
  doc.text(data.section || "Main", midInfoX + 20, infoY);
  
  infoY += 7;
  doc.setFont("helvetica", "normal");
  doc.text("Fee-of:", midInfoX + 3, infoY);
  doc.setFont("helvetica", "bold");
  doc.text(data.feeOfMonth, midInfoX + 20, infoY);
  
  infoY += 7;
  doc.setFont("helvetica", "normal");
  doc.text("Due-Date:", midInfoX + 3, infoY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(data.dueDate, midInfoX + 22, infoY);

  // Right section - Summary slip
  const rightSectionX = pageWidth - 68;
  const rightSectionWidth = 60;
  
  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(...darkColor);
  doc.rect(rightSectionX, contentY, rightSectionWidth, 45);

  infoY = contentY + 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Student-ID:", rightSectionX + 3, infoY);
  doc.setFont("helvetica", "bold");
  doc.text(data.studentId, rightSectionX + 28, infoY);
  
  infoY += 7;
  doc.setFont("helvetica", "normal");
  doc.text("Name:", rightSectionX + 3, infoY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(data.studentName, rightSectionX + 18, infoY);
  
  infoY += 7;
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "normal");
  doc.text("F/Name:", rightSectionX + 3, infoY);
  doc.setFont("helvetica", "bold");
  doc.text(data.fatherName || "N/A", rightSectionX + 20, infoY);
  
  infoY += 7;
  doc.setFont("helvetica", "normal");
  doc.text("Class:", rightSectionX + 3, infoY);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.className}${data.section ? ` (${data.section})` : ""}`, rightSectionX + 16, infoY);
  
  infoY += 7;
  doc.setFont("helvetica", "normal");
  doc.text("Due Date:", rightSectionX + 3, infoY);
  doc.setFont("helvetica", "bold");
  doc.text(data.dueDate, rightSectionX + 22, infoY);

  // Fee Type Title - centered
  const feeTypeY = contentY + 50;
  doc.setFillColor(...primaryColor);
  doc.roundedRect(pageWidth / 2 - 30, feeTypeY - 5, 60, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.feeType, pageWidth / 2, feeTypeY + 2, { align: "center" });

  // Date range badge
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...darkColor);
  doc.roundedRect(pageWidth / 2 + 40, feeTypeY - 5, 50, 10, 2, 2, "FD");
  doc.setTextColor(...darkColor);
  doc.setFontSize(8);
  doc.text("From Sep 20 To Aug 20", pageWidth / 2 + 65, feeTypeY + 2, { align: "center" });

  // Transactions Details label
  doc.setFillColor(...darkColor);
  doc.rect(leftSectionX, feeTypeY - 5, 45, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Transactions: Details", leftSectionX + 22.5, feeTypeY + 1, { align: "center" });

  // Main transaction table
  const tableY = feeTypeY + 10;
  const descColWidth = 45;
  const monthColWidth = 13;
  
  // Table headers
  const tableHeaders = ["Description", ...MONTHS];
  
  // Table data rows
  const tableData = [
    ["Arrears", ...MONTHS.map(m => {
      const monthData = data.monthlyData[m];
      return monthData?.arrears > 0 ? monthData.arrears.toString() : "";
    })],
    [data.feeType.replace(" Fee", ""), ...MONTHS.map(m => {
      const monthData = data.monthlyData[m];
      return monthData?.totalAmount > 0 ? monthData.totalAmount.toString() : "";
    })],
    ["Total Amount", ...MONTHS.map(m => {
      const monthData = data.monthlyData[m];
      const total = (monthData?.arrears || 0) + (monthData?.totalAmount || 0);
      return total > 0 ? total.toString() : "";
    })],
    ["Off/Adjustment", ...MONTHS.map(m => {
      const monthData = data.monthlyData[m];
      return monthData?.adjustment > 0 ? monthData.adjustment.toString() : "";
    })],
    ["Paid Amount", ...MONTHS.map(m => {
      const monthData = data.monthlyData[m];
      return monthData?.paid > 0 ? monthData.paid.toString() : "";
    })],
    ["Balance", ...MONTHS.map(m => {
      const monthData = data.monthlyData[m];
      return monthData?.balance > 0 ? monthData.balance.toString() : "";
    })],
  ];

  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: tableY,
    margin: { left: leftSectionX, right: 70 },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      halign: "center",
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: descColWidth, halign: "left", fontStyle: "bold" },
      ...Object.fromEntries(MONTHS.map((_, i) => [i + 1, { cellWidth: monthColWidth }])),
    },
    theme: "grid",
  });

  const finalTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Right side summary table
  const summaryX = rightSectionX;
  const summaryY = tableY;
  const summaryWidth = rightSectionWidth;
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  
  // Summary table
  const summaryData = [
    ["Description", "Amount"],
    [`Arrears ${data.feeType.replace(" Fee", "")}`, data.totals.arrears.toString()],
    ["Total Payables", data.totals.totalPayables.toString()],
    ["Adjustment", data.totals.adjustment.toString()],
    ["Paid", data.totals.paid.toString()],
  ];

  let summaryRowY = summaryY;
  summaryData.forEach((row, idx) => {
    const isHeader = idx === 0;
    const rowHeight = 8;
    
    if (isHeader) {
      doc.setFillColor(240, 240, 240);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    
    doc.rect(summaryX, summaryRowY, summaryWidth / 2, rowHeight, "FD");
    doc.rect(summaryX + summaryWidth / 2, summaryRowY, summaryWidth / 2, rowHeight, "FD");
    
    doc.setFontSize(8);
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", isHeader ? "bold" : "normal");
    doc.text(row[0], summaryX + 2, summaryRowY + 5.5);
    doc.text(row[1], summaryX + summaryWidth - 2, summaryRowY + 5.5, { align: "right" });
    
    summaryRowY += rowHeight;
  });

  // Cashier signature section - right
  summaryRowY += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Cashier Signature:", summaryX, summaryRowY + 5);
  doc.line(summaryX + 32, summaryRowY + 5, summaryX + summaryWidth, summaryRowY + 5);

  // Footer section
  const footerY = Math.max(finalTableY + 8, summaryRowY + 15);
  
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.5);
  doc.line(leftSectionX, footerY, pageWidth - 8, footerY);

  // Footer fields
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  
  doc.text("Cashier Signature:", leftSectionX, footerY + 8);
  doc.line(leftSectionX + 35, footerY + 8, leftSectionX + 70, footerY + 8);
  
  doc.text("Total Payables:", leftSectionX + 80, footerY + 8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(data.totals.totalPayables.toString(), leftSectionX + 110, footerY + 8);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text("Adjust:", leftSectionX + 130, footerY + 8);
  doc.line(leftSectionX + 145, footerY + 8, leftSectionX + 165, footerY + 8);
  
  doc.text("Paid:", leftSectionX + 175, footerY + 8);
  doc.line(leftSectionX + 188, footerY + 8, leftSectionX + 210, footerY + 8);

  // Generation date at bottom
  doc.setFontSize(7);
  doc.setTextColor(...grayColor);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 8, { align: "center" });

  return doc;
};

export const downloadFeeCard = async (data: FeeCardData): Promise<void> => {
  const doc = await generateFeeCardPdf(data);
  doc.save(`FeeCard-${data.studentId}-${data.feeType.replace(/\s+/g, "_")}-${data.session.replace(/\s+/g, "_")}.pdf`);
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
