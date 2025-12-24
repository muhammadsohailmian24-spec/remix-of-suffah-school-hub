import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  studentName: string;
  studentId: string;
  className?: string;
  feeName: string;
  feeType: string;
  paymentAmount: number;
  paymentMethod: string;
  transactionId?: string;
  totalFeeAmount: number;
  previouslyPaid: number;
  balanceAfterPayment: number;
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
}

export const generateReceiptPdf = (data: ReceiptData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor: [number, number, number] = [34, 197, 94];
  const darkColor: [number, number, number] = [30, 30, 30];
  const grayColor: [number, number, number] = [100, 100, 100];
  
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, "F");
  
  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(data.schoolName || "School Management System", 20, 20);
  
  // School info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.schoolAddress || "123 Education Street, City", 20, 28);
  doc.text(`Phone: ${data.schoolPhone || "+234 000 000 0000"} | Email: ${data.schoolEmail || "info@school.com"}`, 20, 35);
  
  // Receipt title
  doc.setTextColor(...darkColor);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT RECEIPT", pageWidth - 20, 65, { align: "right" });
  
  // Receipt details box
  doc.setFillColor(240, 253, 244);
  doc.rect(pageWidth - 90, 70, 70, 28, "F");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Receipt Number:", pageWidth - 85, 80);
  doc.text("Payment Date:", pageWidth - 85, 88);
  
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "bold");
  doc.text(data.receiptNumber, pageWidth - 25, 80, { align: "right" });
  doc.text(data.paymentDate, pageWidth - 25, 88, { align: "right" });
  
  // Received From section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("RECEIVED FROM", 20, 75);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.studentName, 20, 85);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.text(`Student ID: ${data.studentId}`, 20, 92);
  if (data.className) {
    doc.text(`Class: ${data.className}`, 20, 99);
  }
  
  // Payment confirmation badge
  doc.setFillColor(...primaryColor);
  doc.roundedRect(20, 110, 50, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT CONFIRMED", 45, 118, { align: "center" });
  
  // Payment details table
  autoTable(doc, {
    startY: 135,
    head: [["Description", "Fee Type", "Payment Method", "Amount Paid"]],
    body: [
      [
        data.feeName, 
        data.feeType.charAt(0).toUpperCase() + data.feeType.slice(1),
        data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1).replace("_", " "),
        `N${data.paymentAmount.toLocaleString()}`
      ],
    ],
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: darkColor,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 40 },
      2: { cellWidth: 45 },
      3: { cellWidth: 35, halign: "right" },
    },
    margin: { left: 20, right: 20 },
  });
  
  // Summary section
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  
  // Summary box
  doc.setFillColor(245, 247, 250);
  doc.rect(pageWidth - 95, finalY, 75, 50, "F");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  
  let yPos = finalY + 12;
  doc.text("Total Fee Amount:", pageWidth - 90, yPos);
  doc.setTextColor(...darkColor);
  doc.text(`N${data.totalFeeAmount.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
  yPos += 10;
  doc.setTextColor(...grayColor);
  doc.text("Previously Paid:", pageWidth - 90, yPos);
  doc.setTextColor(...darkColor);
  doc.text(`N${data.previouslyPaid.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
  yPos += 10;
  doc.setTextColor(...grayColor);
  doc.text("This Payment:", pageWidth - 90, yPos);
  doc.setTextColor(34, 197, 94);
  doc.setFont("helvetica", "bold");
  doc.text(`N${data.paymentAmount.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
  // Balance due line
  yPos += 12;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 90, yPos - 4, pageWidth - 25, yPos - 4);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  if (data.balanceAfterPayment <= 0) {
    doc.setTextColor(34, 197, 94);
    doc.text("FULLY PAID", pageWidth - 90, yPos);
    doc.text("N0", pageWidth - 25, yPos, { align: "right" });
  } else {
    doc.setTextColor(234, 179, 8);
    doc.text("Balance Due:", pageWidth - 90, yPos);
    doc.text(`N${data.balanceAfterPayment.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  }
  
  // Transaction details if available
  if (data.transactionId) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayColor);
    doc.text(`Transaction ID: ${data.transactionId}`, 20, finalY + 10);
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 35;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(20, footerY, pageWidth - 20, footerY);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("This is a computer-generated receipt and does not require a signature.", pageWidth / 2, footerY + 8, { align: "center" });
  doc.text("Thank you for your payment!", pageWidth / 2, footerY + 15, { align: "center" });
  doc.text("For any queries, please contact the school administration.", pageWidth / 2, footerY + 22, { align: "center" });
  
  return doc;
};

export const downloadReceipt = (data: ReceiptData) => {
  const doc = generateReceiptPdf(data);
  doc.save(`Receipt-${data.receiptNumber}.pdf`);
};

export const printReceipt = (data: ReceiptData) => {
  const doc = generateReceiptPdf(data);
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
};
