import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface AdmissionFormData {
  studentName: string;
  studentId: string;
  dateOfBirth: string;
  gender?: string;
  phone?: string;
  className?: string;
  section?: string;
  admissionDate: string;
  address?: string;
  previousSchool?: string;
  fatherName: string;
  fatherPhone: string;
  fatherCnic: string;
  fatherEmail?: string;
  occupation?: string;
  photoUrl?: string;
  schoolName?: string;
  schoolAddress?: string;
}

export const generateAdmissionFormPdf = async (data: AdmissionFormData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors - Royal Blue theme
  const primaryColor: [number, number, number] = [30, 100, 180];
  const darkColor: [number, number, number] = [30, 30, 30];
  const grayColor: [number, number, number] = [100, 100, 100];
  const lightGray: [number, number, number] = [240, 240, 240];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(data.schoolName || "The Suffah Public School & College", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.schoolAddress || "Madyan Swat, Pakistan", pageWidth / 2, 23, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ADMISSION FORM", pageWidth / 2, 31, { align: "center" });

  // Photo box (right side)
  const photoX = pageWidth - 50;
  const photoY = 45;
  const photoWidth = 35;
  const photoHeight = 45;

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
      doc.setFontSize(8);
      doc.setTextColor(...grayColor);
      doc.text("Passport Photo", photoX + photoWidth / 2, photoY + photoHeight / 2, { align: "center" });
    }
  } else {
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text("Passport Photo", photoX + photoWidth / 2, photoY + photoHeight / 2, { align: "center" });
  }

  const leftMargin = 15;
  let yPos = 45;

  // Student Information Section
  doc.setFillColor(...lightGray);
  doc.rect(leftMargin, yPos, pageWidth - leftMargin * 2 - 50, 10, "F");
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("STUDENT INFORMATION", leftMargin + 3, yPos + 7);
  yPos += 15;

  doc.setTextColor(...darkColor);
  doc.setFontSize(10);

  const studentInfo = [
    ["Student Name:", data.studentName, "Student ID:", data.studentId],
    ["Date of Birth:", data.dateOfBirth, "Gender:", data.gender || "-"],
    ["Phone:", data.phone || "-", "Admission Date:", data.admissionDate],
    ["Class:", data.className ? `${data.className}${data.section ? ` - ${data.section}` : ""}` : "Not Assigned", "", ""],
  ];

  studentInfo.forEach((row) => {
    doc.setFont("helvetica", "bold");
    doc.text(row[0], leftMargin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(row[1], leftMargin + 35, yPos);
    if (row[2]) {
      doc.setFont("helvetica", "bold");
      doc.text(row[2], leftMargin + 90, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(row[3], leftMargin + 125, yPos);
    }
    yPos += 7;
  });

  yPos += 5;

  // Father/Guardian Information Section
  doc.setFillColor(...lightGray);
  doc.rect(leftMargin, yPos, pageWidth - leftMargin * 2, 10, "F");
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("FATHER/GUARDIAN INFORMATION", leftMargin + 3, yPos + 7);
  yPos += 15;

  doc.setTextColor(...darkColor);
  doc.setFontSize(10);

  const parentInfo = [
    ["Father's Name:", data.fatherName, "CNIC:", data.fatherCnic],
    ["Phone:", data.fatherPhone, "Email:", data.fatherEmail || "-"],
    ["Occupation:", data.occupation || "-", "", ""],
  ];

  parentInfo.forEach((row) => {
    doc.setFont("helvetica", "bold");
    doc.text(row[0], leftMargin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(row[1], leftMargin + 35, yPos);
    if (row[2]) {
      doc.setFont("helvetica", "bold");
      doc.text(row[2], leftMargin + 90, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(row[3], leftMargin + 125, yPos);
    }
    yPos += 7;
  });

  yPos += 5;

  // Address & Education Section
  doc.setFillColor(...lightGray);
  doc.rect(leftMargin, yPos, pageWidth - leftMargin * 2, 10, "F");
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ADDRESS & PREVIOUS EDUCATION", leftMargin + 3, yPos + 7);
  yPos += 15;

  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  
  doc.setFont("helvetica", "bold");
  doc.text("Address:", leftMargin, yPos);
  doc.setFont("helvetica", "normal");
  const addressLines = doc.splitTextToSize(data.address || "-", pageWidth - leftMargin * 2 - 35);
  doc.text(addressLines, leftMargin + 35, yPos);
  yPos += addressLines.length * 5 + 5;

  doc.setFont("helvetica", "bold");
  doc.text("Previous School:", leftMargin, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(data.previousSchool || "-", leftMargin + 35, yPos);

  yPos += 20;

  // Login Credentials Section
  doc.setFillColor(220, 235, 255);
  doc.rect(leftMargin, yPos, pageWidth - leftMargin * 2, 30, "F");
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.rect(leftMargin, yPos, pageWidth - leftMargin * 2, 30, "S");
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("STUDENT LOGIN CREDENTIALS", leftMargin + 3, yPos + 8);
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Student ID (Username):", leftMargin + 3, yPos + 18);
  doc.setFont("helvetica", "normal");
  doc.text(data.studentId, leftMargin + 55, yPos + 18);
  
  doc.setFont("helvetica", "bold");
  doc.text("Password:", leftMargin + 3, yPos + 26);
  doc.setFont("helvetica", "normal");
  doc.text("(As provided during registration)", leftMargin + 28, yPos + 26);

  yPos += 40;

  // Documents Checklist
  doc.setFillColor(...lightGray);
  doc.rect(leftMargin, yPos, pageWidth - leftMargin * 2, 10, "F");
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("REQUIRED DOCUMENTS (For Office Use)", leftMargin + 3, yPos + 7);
  yPos += 15;

  doc.setTextColor(...darkColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const documents = [
    "□ Birth Certificate (Original & Copy)",
    "□ Previous School Leaving Certificate",
    "□ Father's CNIC Copy",
    "□ Passport Size Photos (4 copies)",
    "□ Medical Certificate",
  ];

  documents.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    doc.text(item, leftMargin + col * 90, yPos + row * 6);
  });

  // Footer signatures
  const footerY = doc.internal.pageSize.getHeight() - 35;
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(...grayColor);
  
  // Three signature lines
  const sigWidth = 50;
  const gap = (pageWidth - 2 * leftMargin - 3 * sigWidth) / 2;
  
  doc.line(leftMargin, footerY, leftMargin + sigWidth, footerY);
  doc.line(leftMargin + sigWidth + gap, footerY, leftMargin + 2 * sigWidth + gap, footerY);
  doc.line(leftMargin + 2 * sigWidth + 2 * gap, footerY, leftMargin + 3 * sigWidth + 2 * gap, footerY);

  doc.setFontSize(8);
  doc.setTextColor(...darkColor);
  doc.text("Parent/Guardian Signature", leftMargin, footerY + 5);
  doc.text("Admission Officer", leftMargin + sigWidth + gap, footerY + 5);
  doc.text("Principal", leftMargin + 2 * sigWidth + 2 * gap, footerY + 5);

  // Date at bottom
  doc.setFontSize(8);
  doc.text(`Form Generated: ${new Date().toLocaleDateString()}`, leftMargin, doc.internal.pageSize.getHeight() - 10);

  return doc;
};

export const downloadAdmissionForm = async (data: AdmissionFormData) => {
  const doc = await generateAdmissionFormPdf(data);
  doc.save(`AdmissionForm-${data.studentId}.pdf`);
};
