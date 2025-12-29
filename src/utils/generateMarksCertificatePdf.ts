import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SubjectResult {
  name: string;
  maxMarks: number;
  marksObtained: number;
  grade?: string;
}

interface MarksCertificateData {
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

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.schoolName || "THE SUFFAH PUBLIC SCHOOL & COLLEGE", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(11);
  doc.text(data.schoolAddress || "SAIDU SHARIF SWAT", pageWidth / 2, 28, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PROVISIONAL AND DETAILED MARKS CERTIFICATE", pageWidth / 2, 40, { align: "center" });

  doc.setFontSize(11);
  doc.text(data.examName.toUpperCase(), pageWidth / 2, 48, { align: "center" });

  // Photo box (right side)
  const photoX = pageWidth - 45;
  const photoY = 15;
  const photoWidth = 25;
  const photoHeight = 32;

  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.5);
  doc.rect(photoX, photoY, photoWidth, photoHeight);

  if (data.photoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          doc.addImage(img, "JPEG", photoX, photoY, photoWidth, photoHeight);
          resolve();
        };
        img.onerror = reject;
        img.src = data.photoUrl!;
      });
    } catch (e) {
      // Photo placeholder if failed
    }
  }

  // Session and Group
  let yPos = 60;
  const leftMargin = 20;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Session`, pageWidth / 2 - 20, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.session}`, pageWidth / 2 + 5, yPos);

  yPos += 8;
  doc.setFont("helvetica", "normal");
  doc.text(`Group`, pageWidth / 2 - 20, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(`(${data.group || data.className})`, pageWidth / 2 + 5, yPos);

  // Student details
  yPos += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // This is to certify line
  doc.text("This is certify that", leftMargin, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(data.studentName, leftMargin + 40, yPos);
  
  doc.setFont("helvetica", "normal");
  doc.text("Enroll No", pageWidth - 70, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(data.studentId, pageWidth - 45, yPos);

  yPos += 8;
  doc.setFont("helvetica", "normal");
  doc.text("Son/Daughter of", leftMargin, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(data.fatherName || "-", leftMargin + 40, yPos);
  
  doc.setFont("helvetica", "normal");
  doc.text("Roll No", pageWidth - 70, yPos);
  doc.setFont("helvetica", "bold");
  doc.text(data.rollNumber || data.studentId, pageWidth - 45, yPos);

  // Certification text
  yPos += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const certText = `has secured the marks shown against each subject in the ${data.examName} held in the month of ${data.examMonth || "examination"}.`;
  doc.text(certText, leftMargin, yPos, { maxWidth: pageWidth - 40 });

  // Marks table
  yPos += 15;

  // Calculate totals
  const totalMaxMarks = data.subjects.reduce((sum, sub) => sum + sub.maxMarks, 0);
  const totalObtained = data.subjects.reduce((sum, sub) => sum + sub.marksObtained, 0);

  autoTable(doc, {
    startY: yPos,
    head: [["Subject", "Max Marks", "Marks Obtained", "In Words"]],
    body: [
      ...data.subjects.map((sub) => [
        sub.name,
        String(sub.maxMarks),
        String(sub.marksObtained),
        convertToWords(sub.marksObtained),
      ]),
      ["Total", String(totalMaxMarks), String(totalObtained), convertToWords(totalObtained)],
    ],
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: darkColor,
      fontStyle: "bold",
      fontSize: 9,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkColor,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 35, halign: "center" },
      3: { cellWidth: 55 },
    },
    margin: { left: leftMargin, right: leftMargin },
    theme: "grid",
  });

  // Date of Birth section
  const tableEndY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Date of Birth (In Figures)", leftMargin, tableEndY);
  doc.setFont("helvetica", "bold");
  doc.text(data.dateOfBirth || "-", leftMargin + 50, tableEndY);

  doc.setFont("helvetica", "normal");
  doc.text("(In Words)", leftMargin + 20, tableEndY + 8);
  doc.setFont("helvetica", "bold");
  doc.text(formatDateToWords(data.dateOfBirth), leftMargin + 50, tableEndY + 8);

  // Prepared by section
  const prepY = tableEndY + 25;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Prepared and Checked by:`, leftMargin, prepY);
  doc.setFont("helvetica", "bold");
  doc.text(data.preparedBy || "SCHOOL ADMINISTRATION", leftMargin + 45, prepY);

  doc.setFont("helvetica", "normal");
  doc.text(`Date Prepared:`, leftMargin, prepY + 7);
  doc.setFont("helvetica", "bold");
  doc.text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(), leftMargin + 45, prepY + 7);

  doc.setFont("helvetica", "normal");
  doc.text(`Result Declaration Date:`, leftMargin, prepY + 14);
  doc.setFont("helvetica", "bold");
  doc.text(data.resultDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(), leftMargin + 45, prepY + 14);

  // Controller of Examination signature
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Controller of Examination", pageWidth - leftMargin - 50, prepY + 7);
  doc.text(data.schoolName || "The Suffah Public School", pageWidth - leftMargin - 50, prepY + 14);

  return doc;
};

export const downloadMarksCertificate = async (data: MarksCertificateData) => {
  const doc = await generateMarksCertificatePdf(data);
  doc.save(`MarksCertificate-${data.studentId}.pdf`);
};
