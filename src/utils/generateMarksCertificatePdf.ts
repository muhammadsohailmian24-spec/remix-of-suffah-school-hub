import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadLogo, addWatermark, drawStyledFooter, primaryColor, goldColor, darkColor, grayColor, lightGray } from "./pdfDesignUtils";

interface SubjectResult {
  name: string;
  maxMarks: number;
  marksObtained: number;
  grade?: string;
}

export interface MarksCertificateData {
  studentName: string;
  fatherName?: string;
  studentId: string;
  rollNumber?: string;
  className: string;
  section?: string;
  group?: string;
  session: string;
  dateOfBirth?: string;
  examName: string;
  examMonth?: string;
  subjects: SubjectResult[];
  photoUrl?: string;
  schoolName?: string;
  schoolAddress?: string;
  resultDate?: string;
  preparedBy?: string;
}

const convertToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + convertToWords(num % 100) : '');
  if (num < 10000) return convertToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convertToWords(num % 1000) : '');
  return String(num);
};

const formatDateToWords = (dateStr?: string): string => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    
    const ordinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    
    return `${ordinal(day)} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

export const generateMarksCertificatePdf = async (data: MarksCertificateData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoImg = await loadLogo();
  
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Add watermark
  await addWatermark(doc);

  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 42, "F");
  
  // Gold accent stripe
  doc.setFillColor(...goldColor);
  doc.rect(0, 42, pageWidth, 2.5, "F");

  // Circular logo with gold ring
  if (logoImg) {
    const logoSize = 28;
    const logoX = margin;
    const logoY = 7;
    
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(2);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 3);
    
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 1, 'F');
    
    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }

  // School name in header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.schoolName || "THE SUFFAH PUBLIC SCHOOL & COLLEGE", pageWidth / 2 + 10, 15, { align: "center" });

  // Registration info
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("PSRA Reg. No. 200445000302 | BISE Reg. No. 434-B/Swat-C", pageWidth / 2 + 10, 23, { align: "center" });
  doc.text(data.schoolAddress || "MADYAN SWAT, PAKISTAN", pageWidth / 2 + 10, 30, { align: "center" });

  // Certificate Title in header
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DETAILED MARKS CERTIFICATE", pageWidth / 2 + 10, 39, { align: "center" });

  // Student info section with photo
  let yPos = 52;

  // Photo box on the right side
  const photoWidth = 28;
  const photoHeight = 35;
  const photoX = pageWidth - margin - photoWidth;
  const photoY = yPos;

  // Gold border around photo
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1.5);
  doc.roundedRect(photoX - 1.5, photoY - 1.5, photoWidth + 3, photoHeight + 3, 2, 2, "S");
  
  // Photo placeholder/actual photo
  doc.setFillColor(...lightGray);
  doc.rect(photoX, photoY, photoWidth, photoHeight, "F");

  if (data.photoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          doc.addImage(img, "JPEG", photoX + 0.5, photoY + 0.5, photoWidth - 1, photoHeight - 1);
          resolve();
        };
        img.onerror = reject;
        img.src = data.photoUrl!;
      });
    } catch (e) {
      doc.setFontSize(8);
      doc.setTextColor(...grayColor);
      doc.text("Photo", photoX + photoWidth / 2, photoY + photoHeight / 2, { align: "center" });
    }
  } else {
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text("Photo", photoX + photoWidth / 2, photoY + photoHeight / 2, { align: "center" });
  }

  // Student info card background
  const infoCardWidth = pageWidth - margin * 2 - photoWidth - 8;
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(margin, yPos - 2, infoCardWidth, 40, 3, 3, "F");
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos - 2, infoCardWidth, 40, 3, 3, "S");

  // Student details - Left column
  const leftColX = margin + 5;
  const rightColX = margin + infoCardWidth / 2;
  
  doc.setFontSize(9);
  
  // Row 1: Name and Enroll No
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Student Name:", leftColX, yPos + 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.studentName || "-", leftColX + 28, yPos + 6);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Enroll No:", rightColX, yPos + 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.studentId || "-", rightColX + 22, yPos + 6);

  // Row 2: Father Name and Roll No
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Father Name:", leftColX, yPos + 14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.fatherName || "-", leftColX + 28, yPos + 14);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Roll No:", rightColX, yPos + 14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(data.rollNumber || "-", rightColX + 22, yPos + 14);

  // Row 3: Class and Session
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Class:", leftColX, yPos + 22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(`${data.className} ${data.section || ""}`.trim() || "-", leftColX + 28, yPos + 22);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Session:", rightColX, yPos + 22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.session || "-", rightColX + 22, yPos + 22);

  // Row 4: DOB and Group
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Date of Birth:", leftColX, yPos + 30);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.dateOfBirth || "-", leftColX + 28, yPos + 30);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Group:", rightColX, yPos + 30);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.group || data.className || "-", rightColX + 22, yPos + 30);

  // Exam title with styled box
  yPos = yPos + 48;
  const examTitleWidth = 80;
  const examTitleX = pageWidth / 2 - examTitleWidth / 2;
  doc.setFillColor(...primaryColor);
  doc.roundedRect(examTitleX, yPos - 5, examTitleWidth, 10, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(data.examName.toUpperCase(), pageWidth / 2, yPos + 1, { align: "center" });

  // Gold line separator
  yPos += 10;
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(0.8);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  // Calculate totals
  const totalMaxMarks = data.subjects.reduce((sum, sub) => sum + sub.maxMarks, 0);
  const totalObtained = data.subjects.reduce((sum, sub) => sum + sub.marksObtained, 0);
  const percentage = totalMaxMarks > 0 ? ((totalObtained / totalMaxMarks) * 100).toFixed(1) : "0";

  // Marks table
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [["S.No", "Subject", "Max Marks", "Obtained", "In Words", "Grade"]],
    body: [
      ...data.subjects.map((sub, index) => [
        String(index + 1),
        sub.name,
        String(sub.maxMarks),
        String(sub.marksObtained),
        convertToWords(sub.marksObtained),
        sub.grade || "-",
      ]),
      ["", "TOTAL", String(totalMaxMarks), String(totalObtained), convertToWords(totalObtained), `${percentage}%`],
    ],
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkColor,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 45 },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 50 },
      5: { cellWidth: 18, halign: "center" },
    },
    margin: { left: margin, right: margin },
    theme: "grid",
    didParseCell: (cellData) => {
      // Make the total row bold with gold background
      if (cellData.row.index === cellData.table.body.length - 1) {
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.fillColor = [255, 248, 220];
      }
    },
  });

  // Date of Birth in words section
  const tableEndY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Date of Birth (In Words):", margin, tableEndY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(formatDateToWords(data.dateOfBirth), margin + 45, tableEndY);

  // Bottom section with signatures
  const bottomY = tableEndY + 18;
  
  // Left side - Prepared by
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Prepared by:", margin, bottomY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.preparedBy || "School Administration", margin, bottomY + 5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Result Date:", margin, bottomY + 13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.resultDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(), margin + 22, bottomY + 13);

  // Right side - Controller of Examination with circular seal
  const rightSideX = pageWidth - margin - 55;
  
  // Circular seal placeholder
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1);
  doc.circle(rightSideX + 25, bottomY + 2, 10);
  doc.setFontSize(5);
  doc.setTextColor(...primaryColor);
  doc.text("OFFICIAL", rightSideX + 25, bottomY + 1, { align: "center" });
  doc.text("SEAL", rightSideX + 25, bottomY + 4, { align: "center" });
  
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  doc.line(rightSideX - 5, bottomY + 15, rightSideX + 55, bottomY + 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...darkColor);
  doc.text("Controller of Examination", rightSideX + 5, bottomY + 21);

  // Apply styled footer
  drawStyledFooter(doc, 1, 1, data.schoolAddress || "Madyan Swat, Pakistan");

  return doc;
};

export const downloadMarksCertificate = async (data: MarksCertificateData) => {
  const doc = await generateMarksCertificatePdf(data);
  doc.save(`DMC-${data.rollNumber || data.studentId}.pdf`);
};
