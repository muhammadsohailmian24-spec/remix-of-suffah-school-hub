import jsPDF from "jspdf";
import { loadLogo, addWatermark, drawStyledFooter, primaryColor, goldColor, darkColor, grayColor, lightGray } from "./pdfDesignUtils";

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
  // Document checkboxes
  documents?: {
    birthCertificate?: boolean;
    leavingCertificate?: boolean;
    fatherCnic?: boolean;
    photos?: boolean;
    medicalCertificate?: boolean;
  };
}

export const generateAdmissionFormPdf = async (data: AdmissionFormData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoImg = await loadLogo();
  
  // Add watermark
  await addWatermark(doc);

  // Header - clean design without decorative circles
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 42, "F");
  
  // Gold accent stripe
  doc.setFillColor(...goldColor);
  doc.rect(0, 42, pageWidth, 3, "F");

  // Circular logo with gold ring
  if (logoImg) {
    const logoSize = 30;
    const logoX = 10;
    const logoY = 6;
    
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(2);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 3);
    
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 1, 'F');
    
    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text(data.schoolName || "The Suffah Public School & College", pageWidth / 2 + 12, 15, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.schoolAddress || "Madyan Swat, Pakistan", pageWidth / 2 + 12, 24, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ADMISSION FORM", pageWidth / 2 + 12, 35, { align: "center" });

  // Photo box (right side - positioned to not overlap text)
  const photoX = pageWidth - 50;
  const photoY = 52;
  const photoWidth = 35;
  const photoHeight = 45;

  // Photo border with gold ring effect
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1.5);
  doc.roundedRect(photoX - 2, photoY - 2, photoWidth + 4, photoHeight + 4, 3, 3, "S");
  
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
  let yPos = 52;

  // Student Information Section - width reduced to not overlap with photo
  const sectionWidth = pageWidth - leftMargin * 2 - 50;
  doc.setFillColor(...lightGray);
  doc.roundedRect(leftMargin, yPos, sectionWidth, 10, 2, 2, "F");
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("STUDENT INFORMATION", leftMargin + 3, yPos + 7);
  yPos += 15;

  doc.setTextColor(...darkColor);
  doc.setFontSize(10);

  // Format gender properly
  const formattedGender = data.gender ? 
    (data.gender.charAt(0).toUpperCase() + data.gender.slice(1).toLowerCase()) : 
    "-";

  const studentInfo = [
    ["Student Name:", data.studentName, "Student ID:", data.studentId],
    ["Date of Birth:", data.dateOfBirth, "Gender:", formattedGender],
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
      doc.text(row[2], leftMargin + 85, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(row[3], leftMargin + 120, yPos);
    }
    yPos += 7;
  });

  yPos += 5;

  // Father/Guardian Information Section
  doc.setFillColor(...lightGray);
  doc.roundedRect(leftMargin, yPos, pageWidth - leftMargin * 2, 10, 2, 2, "F");
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
  doc.roundedRect(leftMargin, yPos, pageWidth - leftMargin * 2, 10, 2, 2, "F");
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
  doc.roundedRect(leftMargin, yPos, pageWidth - leftMargin * 2, 32, 3, 3, "F");
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1.5);
  doc.roundedRect(leftMargin, yPos, pageWidth - leftMargin * 2, 32, 3, 3, "S");
  
  // ID icon
  doc.setFillColor(...primaryColor);
  doc.circle(leftMargin + 12, yPos + 16, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ID", leftMargin + 12, yPos + 18, { align: "center" });
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("STUDENT LOGIN CREDENTIALS", leftMargin + 25, yPos + 10);
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Student ID (Username):", leftMargin + 25, yPos + 20);
  doc.setFont("helvetica", "normal");
  doc.text(data.studentId, leftMargin + 75, yPos + 20);
  
  doc.setFont("helvetica", "bold");
  doc.text("Password:", leftMargin + 25, yPos + 28);
  doc.setFont("helvetica", "normal");
  doc.text("(As provided during registration)", leftMargin + 52, yPos + 28);

  yPos += 42;

  // Documents Checklist with actual checkboxes
  doc.setFillColor(...lightGray);
  doc.roundedRect(leftMargin, yPos, pageWidth - leftMargin * 2, 10, 2, 2, "F");
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("REQUIRED DOCUMENTS (For Office Use)", leftMargin + 3, yPos + 7);
  yPos += 15;

  doc.setTextColor(...darkColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const docs = data.documents || {};
  const documents = [
    { label: "Birth Certificate (Original & Copy)", checked: docs.birthCertificate },
    { label: "Previous School Leaving Certificate", checked: docs.leavingCertificate },
    { label: "Father's CNIC Copy", checked: docs.fatherCnic },
    { label: "Passport Size Photos (4 copies)", checked: docs.photos },
    { label: "Medical Certificate", checked: docs.medicalCertificate },
  ];

  documents.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const xPos = leftMargin + col * 90;
    const yPosition = yPos + row * 8;
    
    // Draw checkbox
    doc.setDrawColor(...grayColor);
    doc.setLineWidth(0.5);
    doc.rect(xPos, yPosition - 3.5, 4, 4);
    
    // If checked, draw checkmark
    if (item.checked) {
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.8);
      doc.line(xPos + 0.8, yPosition - 1.5, xPos + 1.8, yPosition - 0.5);
      doc.line(xPos + 1.8, yPosition - 0.5, xPos + 3.5, yPosition - 3);
    }
    
    doc.text(item.label, xPos + 6, yPosition);
  });

  // Footer signatures - clean design without circles
  const footerY = doc.internal.pageSize.getHeight() - 35;
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(...grayColor);
  
  // Three signature lines
  const sigWidth = 50;
  const gap = (pageWidth - 2 * leftMargin - 3 * sigWidth) / 2;
  
  const sigPositions = [leftMargin, leftMargin + sigWidth + gap, leftMargin + 2 * sigWidth + 2 * gap];
  const sigLabels = ["Parent/Guardian Signature", "Admission Officer", "Principal"];
  
  sigPositions.forEach((x, i) => {
    doc.line(x, footerY, x + sigWidth, footerY);
    doc.setFontSize(8);
    doc.setTextColor(...darkColor);
    doc.text(sigLabels[i], x, footerY + 5);
  });

  // Apply styled footer
  drawStyledFooter(doc, 1, 1, data.schoolAddress || "Madyan Swat, Pakistan");

  return doc;
};

export const downloadAdmissionForm = async (data: AdmissionFormData) => {
  const doc = await generateAdmissionFormPdf(data);
  doc.save(`AdmissionForm-${data.studentId}.pdf`);
};