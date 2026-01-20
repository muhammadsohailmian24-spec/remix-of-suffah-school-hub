import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadLogo, addWatermark, drawStyledFooter, primaryColor, goldColor, darkColor, grayColor } from "./pdfDesignUtils";

interface StudentFeeRecord {
  studentId: string;
  studentName: string;
  rollNo: string;
  feeName: string;
  feeType: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  dueDate: string;
  lastPaymentDate?: string;
}

export interface ClassFeeReportData {
  className: string;
  reportMonth?: string;
  reportDate: string;
  students: StudentFeeRecord[];
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
}

export interface IndividualFeeReportData {
  studentName: string;
  studentId: string;
  rollNo: string;
  className: string;
  fatherName?: string;
  phone?: string;
  reportDate: string;
  fees: {
    feeName: string;
    feeType: string;
    amount: number;
    discount: number;
    finalAmount: number;
    paidAmount: number;
    balance: number;
    status: string;
    dueDate: string;
  }[];
  payments: {
    date: string;
    feeName: string;
    amount: number;
    method: string;
    receiptNumber: string | null;
  }[];
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
}

export const generateClassFeeReportPdf = async (data: ClassFeeReportData): Promise<jsPDF> => {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoImg = await loadLogo();
  
  // Add watermark
  await addWatermark(doc);
  
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 38, "F");
  
  // Gold accent stripe
  doc.setFillColor(...goldColor);
  doc.rect(0, 38, pageWidth, 2, "F");
  
  // Decorative circles in header
  doc.setFillColor(255, 255, 255);
  doc.circle(pageWidth - 25, 12, 28, 'F');
  doc.circle(pageWidth - 55, -8, 20, 'F');
  doc.circle(30, 30, 15, 'F');
  
  // Circular logo with gold ring
  if (logoImg) {
    const logoSize = 26;
    const logoX = 10;
    const logoY = 6;
    
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(1.5);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2);
    
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 0.5, 'F');
    
    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }
  
  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text(data.schoolName || "The Suffah Public School & College", 42, 15);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.schoolAddress || "Madyan Swat, Pakistan", 42, 23);
  doc.text(`Phone: ${data.schoolPhone || "+92 000 000 0000"}`, 42, 30);
  
  // Report title
  doc.setTextColor(...darkColor);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("ANNUAL FEE REPORT", pageWidth / 2, 50, { align: "center" });
  
  // Class and date info
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.text(`Class: ${data.className}`, 20, 58);
  doc.text(`Report Date: ${data.reportDate}`, pageWidth - 20, 58, { align: "right" });
  if (data.reportMonth) {
    doc.text(`Month: ${data.reportMonth}`, pageWidth / 2, 58, { align: "center" });
  }
  
  // Calculate class totals
  const classTotalFees = data.students.reduce((sum, s) => sum + s.totalAmount, 0);
  const classTotalPaid = data.students.reduce((sum, s) => sum + s.paidAmount, 0);
  const classTotalBalance = data.students.reduce((sum, s) => sum + s.balance, 0);
  const paidCount = data.students.filter(s => s.status === "paid").length;
  const pendingCount = data.students.filter(s => s.status === "pending" || s.status === "partial").length;
  
  // Stats boxes with circular design accents
  const statsY = 65;
  const boxWidth = 50;
  const boxGap = 10;
  const startX = (pageWidth - (boxWidth * 5 + boxGap * 4)) / 2;
  
  const stats = [
    { label: "Total Students", value: data.students.length.toString(), color: primaryColor },
    { label: "Total Fees", value: `PKR ${classTotalFees.toLocaleString()}`, color: [100, 100, 100] as [number, number, number] },
    { label: "Collected", value: `PKR ${classTotalPaid.toLocaleString()}`, color: [34, 197, 94] as [number, number, number] },
    { label: "Balance", value: `PKR ${classTotalBalance.toLocaleString()}`, color: [239, 68, 68] as [number, number, number] },
    { label: "Paid/Pending", value: `${paidCount}/${pendingCount}`, color: goldColor },
  ];
  
  stats.forEach((stat, index) => {
    const x = startX + (boxWidth + boxGap) * index;
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x, statsY, boxWidth, 22, 3, 3, "F");
    doc.setDrawColor(...stat.color);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, statsY, boxWidth, 22, 3, 3, "S");
    
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text(stat.label, x + boxWidth / 2, statsY + 8, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...stat.color);
    doc.text(stat.value, x + boxWidth / 2, statsY + 17, { align: "center" });
  });
  
  // Student fees table
  autoTable(doc, {
    startY: statsY + 30,
    head: [["#", "Roll No", "Student Name", "Total Fee (Yearly)", "Paid", "Balance", "Status"]],
    body: data.students.map((student, index) => [
      (index + 1).toString(),
      student.rollNo,
      student.studentName,
      `PKR ${student.totalAmount.toLocaleString()}`,
      `PKR ${student.paidAmount.toLocaleString()}`,
      `PKR ${student.balance.toLocaleString()}`,
      student.status.toUpperCase(),
    ]),
    foot: [[
      "",
      "",
      "CLASS TOTAL",
      `PKR ${classTotalFees.toLocaleString()}`,
      `PKR ${classTotalPaid.toLocaleString()}`,
      `PKR ${classTotalBalance.toLocaleString()}`,
      "",
    ]],
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkColor,
    },
    footStyles: {
      fillColor: [255, 248, 220],
      textColor: darkColor,
      fontStyle: "bold",
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 35 },
      2: { cellWidth: 70 },
      3: { cellWidth: 45, halign: "right" },
      4: { cellWidth: 40, halign: "right" },
      5: { cellWidth: 40, halign: "right" },
      6: { cellWidth: 30, halign: "center" },
    },
    margin: { left: 10, right: 10 },
    didParseCell: (data) => {
      // Style status column
      if (data.section === "body" && data.column.index === 6) {
        const status = data.cell.raw?.toString().toLowerCase();
        if (status === "paid") {
          data.cell.styles.textColor = [34, 197, 94];
          data.cell.styles.fontStyle = "bold";
        } else if (status === "overdue") {
          data.cell.styles.textColor = [239, 68, 68];
          data.cell.styles.fontStyle = "bold";
        } else if (status === "partial") {
          data.cell.styles.textColor = [234, 179, 8];
          data.cell.styles.fontStyle = "bold";
        }
      }
      // Style paid column (green)
      if (data.section === "body" && data.column.index === 4) {
        data.cell.styles.textColor = [34, 140, 80];
      }
      // Style balance column (red if > 0)
      if (data.section === "body" && data.column.index === 5) {
        const balanceText = data.cell.raw?.toString() || "";
        const balance = parseFloat(balanceText.replace(/[^0-9.-]/g, "")) || 0;
        if (balance > 0) {
          data.cell.styles.textColor = [220, 60, 60];
        } else {
          data.cell.styles.textColor = [34, 140, 80];
        }
      }
      // Style footer row
      if (data.section === "foot") {
        if (data.column.index === 4) {
          data.cell.styles.textColor = [34, 140, 80];
        }
        if (data.column.index === 5) {
          data.cell.styles.textColor = [220, 60, 60];
        }
      }
    },
  });
  
  // Apply styled footer
  drawStyledFooter(doc, 1, 1, data.schoolAddress || "Madyan Swat, Pakistan");
  
  return doc;
};

export const generateIndividualFeeReportPdf = async (data: IndividualFeeReportData): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoImg = await loadLogo();
  
  // Add watermark
  await addWatermark(doc);
  
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, "F");
  
  // Gold accent stripe
  doc.setFillColor(...goldColor);
  doc.rect(0, 45, pageWidth, 3, "F");
  
  // Decorative circles in header
  doc.setFillColor(255, 255, 255);
  doc.circle(pageWidth - 20, 12, 25, 'F');
  doc.circle(pageWidth - 45, -5, 18, 'F');
  doc.circle(25, 38, 12, 'F');
  
  // Circular logo with gold ring
  if (logoImg) {
    const logoSize = 30;
    const logoX = 10;
    const logoY = 7;
    
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(2);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2);
    
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 0.5, 'F');
    
    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }
  
  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text(data.schoolName || "The Suffah Public School & College", 47, 18);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.schoolAddress || "Madyan Swat, Pakistan", 47, 27);
  doc.text(`Phone: ${data.schoolPhone || "+92 000 000 0000"}`, 47, 35);
  
  // Report title
  doc.setTextColor(...darkColor);
  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text("STUDENT FEE REPORT", pageWidth / 2, 60, { align: "center" });
  
  // Student info card with gold border
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(15, 68, pageWidth - 30, 38, 4, 4, "F");
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1);
  doc.roundedRect(15, 68, pageWidth - 30, 38, 4, 4, "S");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("STUDENT DETAILS", 20, 77);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  
  const col1X = 20;
  const col2X = 110;
  let infoY = 86;
  
  doc.setFont("helvetica", "bold");
  doc.text("Name:", col1X, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(data.studentName, col1X + 25, infoY);
  
  doc.setFont("helvetica", "bold");
  doc.text("Class:", col2X, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(data.className, col2X + 20, infoY);
  
  infoY += 9;
  doc.setFont("helvetica", "bold");
  doc.text("Student ID:", col1X, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(data.studentId, col1X + 30, infoY);
  
  doc.setFont("helvetica", "bold");
  doc.text("Roll No:", col2X, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(data.rollNo, col2X + 23, infoY);
  
  infoY += 9;
  if (data.fatherName) {
    doc.setFont("helvetica", "bold");
    doc.text("Father:", col1X, infoY);
    doc.setFont("helvetica", "normal");
    doc.text(data.fatherName, col1X + 22, infoY);
  }
  
  doc.setFont("helvetica", "bold");
  doc.text("Report Date:", col2X, infoY);
  doc.setFont("helvetica", "normal");
  doc.text(data.reportDate, col2X + 35, infoY);
  
  // Summary stats with circular design
  const totalFees = data.fees.reduce((sum, f) => sum + f.finalAmount, 0);
  const totalPaid = data.fees.reduce((sum, f) => sum + f.paidAmount, 0);
  const totalBalance = data.fees.reduce((sum, f) => sum + f.balance, 0);
  
  const statsY = 115;
  const statBoxWidth = (pageWidth - 50) / 3;
  
  const summaryStats = [
    { label: "Total Fees", value: `PKR ${totalFees.toLocaleString()}`, color: darkColor },
    { label: "Total Paid", value: `PKR ${totalPaid.toLocaleString()}`, color: [34, 197, 94] as [number, number, number] },
    { label: "Balance Due", value: `PKR ${totalBalance.toLocaleString()}`, color: totalBalance > 0 ? [239, 68, 68] : [34, 197, 94] as [number, number, number] },
  ];
  
  summaryStats.forEach((stat, index) => {
    const x = 20 + (statBoxWidth + 5) * index;
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x, statsY, statBoxWidth, 20, 3, 3, "F");
    doc.setDrawColor(stat.color[0], stat.color[1], stat.color[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, statsY, statBoxWidth, 20, 3, 3, "S");
    
    doc.setFontSize(8);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text(stat.label, x + statBoxWidth / 2, statsY + 7, { align: "center" });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(stat.color[0] as number, stat.color[1] as number, stat.color[2] as number);
    doc.text(stat.value, x + statBoxWidth / 2, statsY + 15, { align: "center" });
  });
  
  // Fee details table
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("FEE DETAILS", 20, 146);
  
  autoTable(doc, {
    startY: 150,
    head: [["Fee Name", "Type", "Amount", "Discount", "Final", "Paid", "Balance", "Status"]],
    body: data.fees.map((fee) => [
      fee.feeName,
      fee.feeType.charAt(0).toUpperCase() + fee.feeType.slice(1),
      `PKR ${fee.amount.toLocaleString()}`,
      `PKR ${fee.discount.toLocaleString()}`,
      `PKR ${fee.finalAmount.toLocaleString()}`,
      `PKR ${fee.paidAmount.toLocaleString()}`,
      `PKR ${fee.balance.toLocaleString()}`,
      fee.status.toUpperCase(),
    ]),
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkColor,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252],
    },
    margin: { left: 15, right: 15 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 7) {
        const status = data.cell.raw?.toString().toLowerCase();
        if (status === "paid") {
          data.cell.styles.textColor = [34, 197, 94];
          data.cell.styles.fontStyle = "bold";
        } else if (status === "overdue") {
          data.cell.styles.textColor = [239, 68, 68];
          data.cell.styles.fontStyle = "bold";
        } else if (status === "partial") {
          data.cell.styles.textColor = [234, 179, 8];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });
  
  // Payment history
  if (data.payments.length > 0) {
    const paymentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("PAYMENT HISTORY", 20, paymentY);
    
    autoTable(doc, {
      startY: paymentY + 4,
      head: [["Date", "Fee Name", "Amount", "Method", "Receipt #"]],
      body: data.payments.map((p) => [
        p.date,
        p.feeName,
        `PKR ${p.amount.toLocaleString()}`,
        p.method.charAt(0).toUpperCase() + p.method.slice(1),
        p.receiptNumber || "-",
      ]),
      headStyles: {
        fillColor: [80, 80, 80],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: darkColor,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 252],
      },
      margin: { left: 15, right: 15 },
    });
  }
  
  // Apply styled footer
  drawStyledFooter(doc, 1, 1, data.schoolAddress || "Madyan Swat, Pakistan");
  
  return doc;
};

export const downloadClassFeeReport = async (data: ClassFeeReportData) => {
  const doc = await generateClassFeeReportPdf(data);
  const filename = `Fee-Report-${data.className.replace(/\s+/g, "-")}-${data.reportDate.replace(/\//g, "-")}.pdf`;
  doc.save(filename);
};

export const downloadIndividualFeeReport = async (data: IndividualFeeReportData) => {
  const doc = await generateIndividualFeeReportPdf(data);
  const filename = `Fee-Report-${data.studentName.replace(/\s+/g, "-")}-${data.reportDate.replace(/\//g, "-")}.pdf`;
  doc.save(filename);
};

export const printClassFeeReport = async (data: ClassFeeReportData) => {
  const doc = await generateClassFeeReportPdf(data);
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
};

export const printIndividualFeeReport = async (data: IndividualFeeReportData) => {
  const doc = await generateIndividualFeeReportPdf(data);
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
};
