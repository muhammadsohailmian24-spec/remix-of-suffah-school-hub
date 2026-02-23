import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadLogo, addWatermark, primaryColor, goldColor, darkColor, grayColor } from "./pdfDesignUtils";

export interface ChallanData {
  challanNumber: string;
  issueDate: string;
  dueDate: string;
  studentName: string;
  studentId: string;
  fatherName: string;
  className: string;
  section?: string;
  session: string;
  feeMonth: string;
  feeItems: { name: string; amount: number }[];
  totalAmount: number;
  discount: number;
  netAmount: number;
  previousBalance: number;
  grandTotal: number;
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
}

/**
 * Draw a single challan copy (bank/student/office)
 */
const drawChallanCopy = (
  doc: jsPDF,
  data: ChallanData,
  xOffset: number,
  copyWidth: number,
  copyLabel: string,
  logoImg: HTMLImageElement | null
) => {
  const margin = 3;
  const innerX = xOffset + margin;
  const innerW = copyWidth - margin * 2;

  // Border
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.8);
  doc.rect(xOffset + 1, 5, copyWidth - 2, 282, "S");

  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(xOffset + 1, 5, copyWidth - 2, 32, "F");

  // Gold stripe
  doc.setFillColor(...goldColor);
  doc.rect(xOffset + 1, 37, copyWidth - 2, 2, "F");

  // Logo
  if (logoImg) {
    const logoSize = 16;
    doc.setFillColor(255, 255, 255);
    doc.circle(innerX + logoSize / 2 + 2, 15 + logoSize / 2, logoSize / 2 + 1, "F");
    doc.addImage(logoImg, "PNG", innerX + 2, 15, logoSize, logoSize);
  }

  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  const schoolName = data.schoolName || "The Suffah Public School & College";
  doc.text(schoolName, xOffset + copyWidth / 2, 12, { align: "center" });

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.text(data.schoolAddress || "Madyan Swat, Pakistan", xOffset + copyWidth / 2, 17, { align: "center" });

  // Copy label badge
  doc.setFillColor(...goldColor);
  doc.roundedRect(xOffset + copyWidth / 2 - 14, 22, 28, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text(copyLabel, xOffset + copyWidth / 2, 27.5, { align: "center" });

  // Challan title
  doc.setTextColor(...darkColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("FEE CHALLAN", xOffset + copyWidth / 2, 45, { align: "center" });

  // Challan details
  let y = 50;
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");

  const drawField = (label: string, value: string) => {
    doc.setTextColor(...grayColor);
    doc.text(label, innerX, y);
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "bold");
    doc.text(value, innerX + innerW, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 7;
  };

  drawField("Challan No:", data.challanNumber);
  drawField("Issue Date:", data.issueDate);
  drawField("Due Date:", data.dueDate);
  drawField("Session:", data.session);

  // Separator
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(0.5);
  doc.line(innerX, y, innerX + innerW, y);
  y += 5;

  // Student info
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("STUDENT DETAILS", innerX, y);
  y += 6;

  doc.setFontSize(6);
  drawField("Name:", data.studentName);
  drawField("Father:", data.fatherName);
  drawField("ID:", data.studentId);
  drawField("Class:", data.className + (data.section ? ` (${data.section})` : ""));
  drawField("Month:", data.feeMonth);

  // Separator
  doc.setDrawColor(...goldColor);
  doc.line(innerX, y, innerX + innerW, y);
  y += 5;

  // Fee items table
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("FEE DETAILS", innerX, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Fee Type", "Amount"]],
    body: data.feeItems.map(item => [
      item.name,
      `Rs. ${item.amount.toLocaleString()}`
    ]),
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 5.5,
      cellPadding: 1.5,
    },
    bodyStyles: {
      fontSize: 5.5,
      textColor: darkColor,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: innerW * 0.6 },
      1: { cellWidth: innerW * 0.4, halign: "right" },
    },
    margin: { left: innerX, right: doc.internal.pageSize.getWidth() - (innerX + innerW) },
    tableWidth: innerW,
    theme: "grid",
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // Totals section
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(innerX, y, innerW, 38, 2, 2, "F");
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(innerX, y, innerW, 38, 2, 2, "S");

  y += 6;
  doc.setFontSize(5.5);

  const drawTotalLine = (label: string, value: string, bold = false, color: [number, number, number] = darkColor) => {
    doc.setTextColor(...grayColor);
    doc.setFont("helvetica", "normal");
    doc.text(label, innerX + 3, y);
    doc.setTextColor(...color);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(value, innerX + innerW - 3, y, { align: "right" });
    y += 6;
  };

  drawTotalLine("Total:", `Rs. ${data.totalAmount.toLocaleString()}`);
  drawTotalLine("Discount:", `-Rs. ${data.discount.toLocaleString()}`);
  drawTotalLine("Net Amount:", `Rs. ${data.netAmount.toLocaleString()}`);
  drawTotalLine("Prev. Balance:", `Rs. ${data.previousBalance.toLocaleString()}`);

  // Grand total highlight
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(0.5);
  doc.line(innerX + 3, y - 2, innerX + innerW - 3, y - 2);
  y += 2;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("PAYABLE:", innerX + 3, y);
  doc.text(`Rs. ${data.grandTotal.toLocaleString()}`, innerX + innerW - 3, y, { align: "right" });
  y += 10;

  // Amount in words
  doc.setFontSize(5);
  doc.setTextColor(...grayColor);
  doc.setFont("helvetica", "italic");
  doc.text(`(${numberToWords(data.grandTotal)} Rupees Only)`, innerX, y, { maxWidth: innerW });
  y += 12;

  // Signature area
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  doc.line(innerX + 3, y + 8, innerX + innerW - 3, y + 8);
  doc.setFontSize(5);
  doc.setTextColor(...grayColor);
  doc.setFont("helvetica", "normal");
  doc.text("Authorized Signature / Stamp", xOffset + copyWidth / 2, y + 12, { align: "center" });

  // Footer note
  doc.setFontSize(4.5);
  doc.setTextColor(...grayColor);
  doc.text("Late fee will be charged after due date", xOffset + copyWidth / 2, 282, { align: "center" });
};

/**
 * Convert number to words (Pakistani style)
 */
const numberToWords = (num: number): string => {
  if (num === 0) return "Zero";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  };

  return convert(Math.round(num));
};

/**
 * Generate a 3-copy challan (Bank Copy, Student Copy, Office Copy) on one A4 page
 */
export const generateChallanPdf = async (data: ChallanData): Promise<jsPDF> => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoImg = await loadLogo();

  await addWatermark(doc, 0.03);

  const copyWidth = pageWidth / 3;
  const copies: [number, string][] = [
    [0, "BANK COPY"],
    [copyWidth, "STUDENT COPY"],
    [copyWidth * 2, "OFFICE COPY"],
  ];

  // Dashed vertical separator lines
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(copyWidth, 5, copyWidth, 287);
  doc.line(copyWidth * 2, 5, copyWidth * 2, 287);
  doc.setLineDashPattern([], 0);

  for (const [xOffset, label] of copies) {
    drawChallanCopy(doc, data, xOffset, copyWidth, label, logoImg);
  }

  return doc;
};

export const downloadChallan = async (data: ChallanData) => {
  const doc = await generateChallanPdf(data);
  doc.save(`Challan-${data.challanNumber}.pdf`);
};

export const printChallan = async (data: ChallanData) => {
  const doc = await generateChallanPdf(data);
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
};
