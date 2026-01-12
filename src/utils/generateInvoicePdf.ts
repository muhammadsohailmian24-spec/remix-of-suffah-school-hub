import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface InvoiceData {
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


export const generateInvoicePdf = async (data: InvoiceData): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors - Royal Blue theme
  const primaryColor: [number, number, number] = [30, 100, 180];
  const darkColor: [number, number, number] = [30, 30, 30];
  const grayColor: [number, number, number] = [100, 100, 100];
  
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, "F");
  
  // Add logo (square aspect ratio)
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => {
        doc.addImage(logoImg, "PNG", 10, 8, 34, 34);
        resolve();
      };
      logoImg.onerror = reject;
      logoImg.src = "/images/school-logo.png";
    });
  } catch (e) {
    // Continue without logo if it fails
  }
  
  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(data.schoolName || "The Suffah Public School & College", 50, 20);
  
  // School info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.schoolAddress || "Madyan Swat, Pakistan", 50, 28);
  doc.text(`Phone: ${data.schoolPhone || "+92 000 000 0000"} | Email: ${data.schoolEmail || "info@suffah.edu.pk"}`, 50, 36);
  
  // Invoice title
  doc.setTextColor(...darkColor);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - 20, 70, { align: "right" });
  
  // Invoice details box
  doc.setFillColor(245, 247, 250);
  doc.rect(pageWidth - 90, 75, 70, 35, "F");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Invoice Number:", pageWidth - 85, 85);
  doc.text("Invoice Date:", pageWidth - 85, 93);
  doc.text("Due Date:", pageWidth - 85, 101);
  
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "bold");
  doc.text(data.invoiceNumber, pageWidth - 25, 85, { align: "right" });
  doc.text(data.invoiceDate, pageWidth - 25, 93, { align: "right" });
  doc.text(data.dueDate, pageWidth - 25, 101, { align: "right" });
  
  // Bill To section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("BILL TO", 20, 80);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.studentName, 20, 90);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.text(`Student ID: ${data.studentId}`, 20, 97);
  if (data.className) {
    doc.text(`Class: ${data.className}`, 20, 104);
  }
  
  // Status badge
  const statusColors: Record<string, [number, number, number]> = {
    paid: [30, 100, 180],
    partial: [234, 179, 8],
    pending: [148, 163, 184],
    overdue: [239, 68, 68],
  };
  const statusColor = statusColors[data.status] || statusColors.pending;
  
  doc.setFillColor(...statusColor);
  doc.roundedRect(pageWidth - 55, 115, 35, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(data.status.toUpperCase(), pageWidth - 37.5, 122, { align: "center" });
  
  // Fee details table
  autoTable(doc, {
    startY: 135,
    head: [["Description", "Fee Type", "Amount"]],
    body: [
      [data.feeName, data.feeType.charAt(0).toUpperCase() + data.feeType.slice(1), `PKR ${data.amount.toLocaleString()}`],
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
  doc.text(`PKR ${data.amount.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
  yPos += 8;
  doc.setTextColor(...grayColor);
  doc.text("Discount:", pageWidth - 85, yPos);
  doc.setTextColor(30, 100, 180);
  doc.text(`-PKR ${data.discount.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
  yPos += 8;
  doc.setTextColor(...grayColor);
  doc.text("Paid:", pageWidth - 85, yPos);
  doc.setTextColor(30, 100, 180);
  doc.text(`-PKR ${data.paidAmount.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
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
  doc.text(`PKR ${balance.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  
  // Payment history if exists
  if (data.payments.length > 0) {
    const paymentStartY = finalY + 60;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Payment History", 20, paymentStartY);
    
    autoTable(doc, {
      startY: paymentStartY + 5,
      head: [["Date", "Amount", "Method", "Receipt #"]],
      body: data.payments.map((p) => [
        p.date,
        `PKR ${p.amount.toLocaleString()}`,
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

export const downloadInvoice = async (data: InvoiceData) => {
  const doc = await generateInvoicePdf(data);
  doc.save(`Invoice-${data.invoiceNumber}.pdf`);
};

export const printInvoice = async (data: InvoiceData) => {
  const doc = await generateInvoicePdf(data);
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
};
