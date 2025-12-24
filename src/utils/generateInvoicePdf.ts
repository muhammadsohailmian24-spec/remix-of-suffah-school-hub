import jsPDF from "jspdf";
import "jspdf-autotable";

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  studentName: string;
  studentId: string;
  className?: string;
  feeName: string;
  feeType: string;
  amount: number;
  discount: number;
  finalAmount: number;
  paidAmount: number;
  status: string;
  payments: {
    date: string;
    amount: number;
    method: string;
    receiptNumber: string | null;
  }[];
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
}

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF;
  }
}

export const generateInvoicePdf = (data: InvoiceData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor: [number, number, number] = [41, 98, 255];
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
  
  // Invoice title
  doc.setTextColor(...darkColor);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - 20, 65, { align: "right" });
  
  // Invoice details box
  doc.setFillColor(245, 247, 250);
  doc.rect(pageWidth - 90, 70, 70, 35, "F");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Invoice Number:", pageWidth - 85, 80);
  doc.text("Invoice Date:", pageWidth - 85, 88);
  doc.text("Due Date:", pageWidth - 85, 96);
  
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "bold");
  doc.text(data.invoiceNumber, pageWidth - 25, 80, { align: "right" });
  doc.text(data.invoiceDate, pageWidth - 25, 88, { align: "right" });
  doc.text(data.dueDate, pageWidth - 25, 96, { align: "right" });
  
  // Bill To section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("BILL TO", 20, 75);
  
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
  
  // Status badge
  const statusColors: Record<string, [number, number, number]> = {
    paid: [34, 197, 94],
    partial: [234, 179, 8],
    pending: [148, 163, 184],
    overdue: [239, 68, 68],
  };
  const statusColor = statusColors[data.status] || statusColors.pending;
  
  doc.setFillColor(...statusColor);
  doc.roundedRect(pageWidth - 55, 110, 35, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(data.status.toUpperCase(), pageWidth - 37.5, 117, { align: "center" });
  
  // Fee details table
  doc.autoTable({
    startY: 130,
    head: [["Description", "Fee Type", "Amount"]],
    body: [
      [data.feeName, data.feeType.charAt(0).toUpperCase() + data.feeType.slice(1), `₦${data.amount.toLocaleString()}`],
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
      0: { cellWidth: 80 },
      1: { cellWidth: 50 },
      2: { cellWidth: 40, halign: "right" },
    },
    margin: { left: 20, right: 20 },
  });
  
  // Totals section
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  
  // Totals box
  doc.setFillColor(245, 247, 250);
  doc.rect(pageWidth - 90, finalY, 70, 45, "F");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  
  let yPos = finalY + 10;
  doc.text("Subtotal:", pageWidth - 85, yPos);
  doc.setTextColor(...darkColor);
  doc.text(`₦${data.amount.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
  yPos += 8;
  doc.setTextColor(...grayColor);
  doc.text("Discount:", pageWidth - 85, yPos);
  doc.setTextColor(34, 197, 94);
  doc.text(`-₦${data.discount.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
  yPos += 8;
  doc.setTextColor(...grayColor);
  doc.text("Paid:", pageWidth - 85, yPos);
  doc.setTextColor(34, 197, 94);
  doc.text(`-₦${data.paidAmount.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
  // Total due line
  yPos += 12;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 85, yPos - 4, pageWidth - 25, yPos - 4);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text("Balance Due:", pageWidth - 85, yPos);
  const balance = Math.max(0, data.finalAmount - data.paidAmount);
  doc.text(`₦${balance.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
  // Payment history if exists
  if (data.payments.length > 0) {
    const paymentStartY = finalY + 60;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Payment History", 20, paymentStartY);
    
    doc.autoTable({
      startY: paymentStartY + 5,
      head: [["Date", "Amount", "Method", "Receipt #"]],
      body: data.payments.map((p) => [
        p.date,
        `₦${p.amount.toLocaleString()}`,
        p.method.charAt(0).toUpperCase() + p.method.slice(1),
        p.receiptNumber || "-",
      ]),
      headStyles: {
        fillColor: [100, 100, 100],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: darkColor,
      },
      margin: { left: 20, right: 20 },
    });
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 25;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(20, footerY, pageWidth - 20, footerY);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Thank you for your payment!", pageWidth / 2, footerY + 8, { align: "center" });
  doc.text("For any queries, please contact the school administration.", pageWidth / 2, footerY + 14, { align: "center" });
  
  return doc;
};

export const downloadInvoice = (data: InvoiceData) => {
  const doc = generateInvoicePdf(data);
  doc.save(`Invoice-${data.invoiceNumber}.pdf`);
};

export const printInvoice = (data: InvoiceData) => {
  const doc = generateInvoicePdf(data);
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
};
