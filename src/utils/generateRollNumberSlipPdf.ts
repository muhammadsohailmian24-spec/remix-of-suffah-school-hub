import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadLogo, addWatermark, drawStyledFooter, primaryColor, goldColor, darkColor, grayColor } from "./pdfDesignUtils";

export interface RollNumberSlipData {
  studentName: string;
  studentId: string;
  fatherName?: string;
  className: string;
  section?: string;
  rollNumber?: string;
  examName: string;
  examDate: string;
  examTime?: string;
  subjects: {
    name: string;
    date: string;
    time?: string;
  }[];
  photoUrl?: string;
  schoolName?: string;
  schoolAddress?: string;
}

const generateSingleSlip = async (doc: jsPDF, data: RollNumberSlipData, logoImg: HTMLImageElement | null): Promise<void> => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add watermark
  await addWatermark(doc);

  // Header
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
  doc.text(data.schoolName || "The Suffah Public School & College", pageWidth / 2 + 12, 14, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.schoolAddress || "Madyan Swat, Pakistan", pageWidth / 2 + 12, 23, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("EXAMINATION ROLL NUMBER SLIP", pageWidth / 2 + 12, 35, { align: "center" });

  // Photo box (right side) with gold border
  const photoX = pageWidth - 50;
  const photoY = 52;
  const photoWidth = 30;
  const photoHeight = 40;

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
      doc.text("Photo", photoX + photoWidth / 2, photoY + photoHeight / 2, { align: "center" });
    }
  } else {
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text("Photo", photoX + photoWidth / 2, photoY + photoHeight / 2, { align: "center" });
  }

  // Student details (left side)
  let yPos = 57;
  const leftMargin = 20;

  doc.setTextColor(...darkColor);
  doc.setFontSize(11);

  const details = [
    { label: "Student Name:", value: data.studentName },
    { label: "Father's Name:", value: data.fatherName || "-" },
    { label: "Student ID:", value: data.studentId },
    { label: "Roll Number:", value: data.rollNumber || data.studentId },
    { label: "Class:", value: `${data.className}${data.section ? ` - ${data.section}` : ""}` },
    { label: "Examination:", value: data.examName },
  ];

  details.forEach((detail) => {
    doc.setFont("helvetica", "bold");
    doc.text(detail.label, leftMargin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(detail.value, leftMargin + 40, yPos);
    yPos += 8;
  });

  // Exam schedule section header
  yPos = 107;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text("EXAMINATION SCHEDULE", leftMargin, yPos);

  autoTable(doc, {
    startY: yPos + 5,
    head: [["S.No", "Subject", "Date", "Time"]],
    body: data.subjects.map((sub, index) => [
      String(index + 1),
      sub.name,
      sub.date,
      sub.time || "-",
    ]),
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
      0: { cellWidth: 15, halign: "center" },
      1: { cellWidth: 60 },
      2: { cellWidth: 40 },
      3: { cellWidth: 40 },
    },
    margin: { left: leftMargin, right: leftMargin },
  });

  // Instructions with circular bullet points
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text("INSTRUCTIONS:", leftMargin, finalY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const instructions = [
    "Bring this slip to the examination hall.",
    "Students must be present 15 minutes before exam time.",
    "No electronic devices are allowed in the examination hall.",
    "Students should bring their own stationery.",
  ];

  instructions.forEach((instruction, index) => {
    // Circular bullet
    doc.setFillColor(...primaryColor);
    doc.circle(leftMargin + 2, finalY + 6 + index * 6, 1.5, 'F');
    doc.setTextColor(...darkColor);
    doc.text(instruction, leftMargin + 8, finalY + 8 + index * 6);
  });
  
  // Apply styled footer
  drawStyledFooter(doc, 1, 1, data.schoolAddress || "Madyan Swat, Pakistan");
};

export const generateRollNumberSlipPdf = async (data: RollNumberSlipData) => {
  const doc = new jsPDF();
  const logoImg = await loadLogo();
  await generateSingleSlip(doc, data, logoImg);
  return doc;
};

export const downloadRollNumberSlip = async (data: RollNumberSlipData) => {
  const doc = await generateRollNumberSlipPdf(data);
  doc.save(`RollNumberSlip-${data.studentId}.pdf`);
};

export const generateClassRollNumberSlips = async (students: RollNumberSlipData[]) => {
  const combinedDoc = new jsPDF();
  const logoImg = await loadLogo();

  for (let i = 0; i < students.length; i++) {
    if (i > 0) combinedDoc.addPage();
    await generateSingleSlip(combinedDoc, students[i], logoImg);
  }

  return combinedDoc;
};

export const downloadClassRollNumberSlips = async (students: RollNumberSlipData[], className: string) => {
  const doc = await generateClassRollNumberSlips(students);
  doc.save(`RollNumberSlips-${className.replace(/\s+/g, "-")}.pdf`);
};
