import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadLogo, addWatermark, primaryColor, goldColor, darkColor, grayColor } from "./pdfDesignUtils";

// Academic year months starting from March (new session)
const MONTHS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];

export interface FeeCardData {
  studentId: string;
  studentName: string;
  fatherName: string;
  className: string;
  section?: string;
  session: string;
  feeType: string;
  monthlyAmount: number;
  totalPaid: number;
  balance: number;
  dueDate: string;
  feeOfMonth: string;
}

export const generateFeeCardPdf = async (data: FeeCardData): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  // Add watermark
  await addWatermark(doc, 0.05);

  // Load logo
  const logoImg = await loadLogo();

  // ===== HEADER SECTION =====
  // Gradient-style header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 38, "F");
  
  // Gold accent line
  doc.setFillColor(...goldColor);
  doc.rect(0, 38, pageWidth, 2, "F");

  // Logo on left
  if (logoImg) {
    doc.setFillColor(255, 255, 255);
    doc.circle(margin + 14, 19, 15, "F");
    doc.addImage(logoImg, "PNG", margin + 2, 7, 24, 24);
  }

  // School name and details
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("The Suffah Public School & College", pageWidth / 2, 14, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Madyan Swat, Pakistan | PSRA Reg. No. 200445000302 | BISE Reg. No. 434-B/Swat-C", pageWidth / 2, 22, { align: "center" });

  // Fee Card Title Badge
  doc.setFillColor(...goldColor);
  doc.roundedRect(pageWidth / 2 - 35, 26, 70, 10, 2, 2, "F");
  doc.setTextColor(...darkColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.feeType} FEE CARD`, pageWidth / 2, 33, { align: "center" });

  // Session badge on right
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - margin - 50, 10, 48, 18, 3, 3, "F");
  doc.setTextColor(...primaryColor);
  doc.setFontSize(8);
  doc.text("Academic Session", pageWidth - margin - 26, 17, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(data.session, pageWidth - margin - 26, 24, { align: "center" });

  // ===== STUDENT INFO SECTION =====
  const infoY = 46;
  
  // Student info card - left side
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, infoY, 130, 32, 3, 3, "F");
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, infoY, 130, 32, 3, 3, "S");

  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  doc.setFont("helvetica", "normal");
  
  // Left column
  doc.text("Student ID:", margin + 4, infoY + 8);
  doc.text("Student Name:", margin + 4, infoY + 16);
  doc.text("Father's Name:", margin + 4, infoY + 24);
  
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "bold");
  doc.text(data.studentId, margin + 35, infoY + 8);
  doc.text(data.studentName, margin + 35, infoY + 16);
  doc.text(data.fatherName, margin + 35, infoY + 24);

  // Right column within student card
  doc.setTextColor(...grayColor);
  doc.setFont("helvetica", "normal");
  doc.text("Class:", margin + 80, infoY + 8);
  doc.text("Section:", margin + 80, infoY + 16);
  doc.text("Fee Month:", margin + 80, infoY + 24);
  
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "bold");
  doc.text(data.className, margin + 100, infoY + 8);
  doc.text(data.section || "Main", margin + 100, infoY + 16);
  doc.setTextColor(...primaryColor);
  doc.text(data.feeOfMonth, margin + 100, infoY + 24);

  // Summary card - right side
  const summaryX = pageWidth - margin - 90;
  doc.setFillColor(...primaryColor);
  doc.roundedRect(summaryX, infoY, 90, 32, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  
  const monthlyTotal = data.monthlyAmount * 12;
  
  doc.text("Monthly Fee:", summaryX + 5, infoY + 9);
  doc.text("Total Payable:", summaryX + 5, infoY + 17);
  doc.text("Total Paid:", summaryX + 5, infoY + 25);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Rs. ${data.monthlyAmount.toLocaleString()}`, summaryX + 50, infoY + 9);
  doc.text(`Rs. ${monthlyTotal.toLocaleString()}`, summaryX + 50, infoY + 17);
  doc.text(`Rs. ${data.totalPaid.toLocaleString()}`, summaryX + 50, infoY + 25);

  // Balance badge
  const balanceY = infoY + 34;
  doc.setFillColor(...goldColor);
  doc.roundedRect(summaryX, balanceY, 90, 12, 3, 3, "F");
  doc.setTextColor(...darkColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("BALANCE DUE:", summaryX + 5, balanceY + 8);
  doc.setFontSize(12);
  doc.text(`Rs. ${data.balance.toLocaleString()}`, summaryX + 55, balanceY + 8);

  // ===== MONTHLY BREAKDOWN TABLE =====
  const tableY = 92;
  
  // Table title
  doc.setFillColor(...darkColor);
  doc.roundedRect(margin, tableY - 8, 80, 7, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Monthly Fee Breakdown", margin + 40, tableY - 3, { align: "center" });

  // Build table data with arrears tracking - NO Annual Fee row, just balance tracking
  // The grid shows only: Arrears B/F, Total Amount, Paid, Balance C/F
  let cumulativeArrears = 0;
  const arrearsRow = ["Arrears B/F"];
  const monthlyFeeRow = ["Monthly Fee"];
  const totalRow = ["Total Amount"];
  const paidRow = ["Paid"];
  const balanceRow = ["Balance C/F"];

  MONTHS.forEach(() => {
    arrearsRow.push(cumulativeArrears > 0 ? cumulativeArrears.toLocaleString() : "-");
    monthlyFeeRow.push(data.monthlyAmount.toLocaleString());
    
    const monthTotal = cumulativeArrears + data.monthlyAmount;
    totalRow.push(monthTotal.toLocaleString());
    paidRow.push("-"); // Legacy doesn't track per-month payments
    balanceRow.push(monthTotal.toLocaleString());
    
    cumulativeArrears = monthTotal;
  });

  autoTable(doc, {
    head: [["Description", ...MONTHS]],
    body: [arrearsRow, monthlyFeeRow, totalRow, paidRow, balanceRow],
    startY: tableY,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 7,
      cellPadding: 3,
      halign: "center",
      valign: "middle",
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: darkColor,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 28, halign: "left", fontStyle: "bold", fillColor: [240, 240, 240] },
    },
    theme: "grid",
  });

  const finalTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // ===== FOOTER SECTION =====
  const footerY = finalTableY + 10;

  // Due date notice
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(margin, footerY, 100, 12, 2, 2, "F");
  doc.setDrawColor(234, 179, 8);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, footerY, 100, 12, 2, 2, "S");
  doc.setTextColor(146, 64, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Due Date: ${data.dueDate}`, margin + 50, footerY + 7.5, { align: "center" });

  // Signature sections
  const sigY = footerY + 20;
  doc.setTextColor(...grayColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  
  doc.text("Parent/Guardian Signature", margin + 35, sigY + 12, { align: "center" });
  doc.setDrawColor(...grayColor);
  doc.line(margin, sigY + 8, margin + 70, sigY + 8);

  doc.text("Cashier Signature", pageWidth / 2, sigY + 12, { align: "center" });
  doc.line(pageWidth / 2 - 35, sigY + 8, pageWidth / 2 + 35, sigY + 8);

  doc.text("Principal Signature", pageWidth - margin - 35, sigY + 12, { align: "center" });
  doc.line(pageWidth - margin - 70, sigY + 8, pageWidth - margin, sigY + 8);

  // Generation date
  doc.setFontSize(7);
  doc.setTextColor(...grayColor);
  doc.text(`Generated: ${new Date().toLocaleDateString()} | This is a computer-generated document`, pageWidth / 2, pageHeight - 8, { align: "center" });

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
