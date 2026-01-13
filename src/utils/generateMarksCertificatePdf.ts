import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  
  // Colors
  const darkColor: [number, number, number] = [0, 0, 0];
  const grayColor: [number, number, number] = [80, 80, 80];
  const leftMargin = 15;
  const rightMargin = 15;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Photo box (right side) - draw first
  const photoX = pageWidth - rightMargin - 30;
  const photoY = 12;
  const photoWidth = 28;
  const photoHeight = 35;

  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.5);
  doc.rect(photoX, photoY, photoWidth, photoHeight);

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
      // Photo placeholder if failed
      doc.setFontSize(8);
      doc.setTextColor(...grayColor);
      doc.text("Photo", photoX + photoWidth / 2, photoY + photoHeight / 2, { align: "center" });
    }
  }

  // Add logo (square aspect ratio)
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => {
        doc.addImage(logoImg, "PNG", leftMargin, 8, 25, 25);
        resolve();
      };
      logoImg.onerror = reject;
      logoImg.src = "/images/school-logo.png";
    });
  } catch (e) {
    // Continue without logo if it fails
  }

  // Header - School Name
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.schoolName || "THE SUFFAH PUBLIC SCHOOL & COLLEGE", pageWidth / 2 + 10, 18, { align: "center" });

  // School Address
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(data.schoolAddress || "MADYAN SWAT, PAKISTAN", pageWidth / 2 + 10, 26, { align: "center" });

  // Certificate Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PROVISIONAL AND DETAILED MARKS CERTIFICATE", pageWidth / 2, 38, { align: "center" });

  // Exam Name
  doc.setFontSize(12);
  doc.text(data.examName.toUpperCase(), pageWidth / 2, 46, { align: "center" });

  // Horizontal line under header
  doc.setLineWidth(0.3);
  doc.line(leftMargin, 50, pageWidth - rightMargin, 50);

  // Session and Group - centered
  let yPos = 58;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Session:", pageWidth / 2 - 25, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(data.session, pageWidth / 2, yPos);

  yPos += 7;
  doc.setFont("helvetica", "normal");
  doc.text("Group:", pageWidth / 2 - 25, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(`(${data.group || data.className})`, pageWidth / 2, yPos);

  // Student details section
  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Row 1: Name and Enroll No
  doc.text("This is to certify that", leftMargin, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(data.studentName, leftMargin + 42, yPos);
  
  doc.setFont("helvetica", "normal");
  doc.text("Enroll No:", pageWidth - rightMargin - 55, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(data.studentId, pageWidth - rightMargin - 30, yPos);

  // Row 2: Father's Name and Roll No
  yPos += 7;
  doc.setFont("helvetica", "normal");
  doc.text("Son/Daughter of", leftMargin, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(data.fatherName || "-", leftMargin + 42, yPos);
  
  doc.setFont("helvetica", "normal");
  doc.text("Roll No:", pageWidth - rightMargin - 55, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(data.rollNumber || data.studentId, pageWidth - rightMargin - 30, yPos);

  // Certification text
  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const certText = `has secured the marks shown against each subject in the ${data.examName} held in the month of ${data.examMonth || "examination"}.`;
  doc.text(certText, leftMargin, yPos, { maxWidth: contentWidth });

  // Marks table
  yPos += 10;

  // Calculate totals
  const totalMaxMarks = data.subjects.reduce((sum, sub) => sum + sub.maxMarks, 0);
  const totalObtained = data.subjects.reduce((sum, sub) => sum + sub.marksObtained, 0);

  autoTable(doc, {
    startY: yPos,
    head: [["S.No", "Subject", "Max Marks", "Marks Obtained", "In Words"]],
    body: [
      ...data.subjects.map((sub, index) => [
        String(index + 1),
        sub.name,
        String(sub.maxMarks),
        String(sub.marksObtained),
        convertToWords(sub.marksObtained),
      ]),
      ["", "TOTAL", String(totalMaxMarks), String(totalObtained), convertToWords(totalObtained)],
    ],
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: darkColor,
      fontStyle: "bold",
      fontSize: 9,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkColor,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 55 },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 30, halign: "center" },
      4: { cellWidth: 48 },
    },
    margin: { left: leftMargin, right: rightMargin },
    theme: "grid",
    didParseCell: (data) => {
      // Make the total row bold
      if (data.row.index === data.table.body.length - 1) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // Date of Birth section
  const tableEndY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Date of Birth (In Figures):", leftMargin, tableEndY);
  doc.setFont("helvetica", "bold");
  doc.text(data.dateOfBirth || "-", leftMargin + 48, tableEndY);

  doc.setFont("helvetica", "normal");
  doc.text("(In Words):", leftMargin + 20, tableEndY + 7);
  doc.setFont("helvetica", "bold");
  doc.text(formatDateToWords(data.dateOfBirth), leftMargin + 48, tableEndY + 7);

  // Bottom section with prepared by and controller
  const bottomY = tableEndY + 22;
  
  // Left side - Prepared by
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Prepared and Checked by:", leftMargin, bottomY);
  doc.setFont("helvetica", "bold");
  doc.text(data.preparedBy || "SCHOOL ADMINISTRATION", leftMargin, bottomY + 6);

  doc.setFont("helvetica", "normal");
  doc.text("Date Prepared:", leftMargin, bottomY + 14);
  doc.setFont("helvetica", "bold");
  doc.text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(), leftMargin + 30, bottomY + 14);

  doc.setFont("helvetica", "normal");
  doc.text("Result Declaration Date:", leftMargin, bottomY + 21);
  doc.setFont("helvetica", "bold");
  doc.text(data.resultDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(), leftMargin + 45, bottomY + 21);

  // Right side - Controller of Examination
  const rightSideX = pageWidth - rightMargin - 60;
  doc.setFont("helvetica", "normal");
  doc.text("________________________", rightSideX, bottomY + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Controller of Examination", rightSideX + 5, bottomY + 14);
  doc.setFontSize(9);
  doc.text(data.schoolName || "The Suffah Public School", rightSideX + 5, bottomY + 21);

  return doc;
};

export const downloadMarksCertificate = async (data: MarksCertificateData) => {
  const doc = await generateMarksCertificatePdf(data);
  doc.save(`MarksCertificate-${data.studentId}.pdf`);
};
