import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

export const generateRollNumberSlipPdf = async (data: RollNumberSlipData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor: [number, number, number] = [30, 64, 175];
  const darkColor: [number, number, number] = [30, 30, 30];
  const grayColor: [number, number, number] = [100, 100, 100];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(data.schoolName || "The Suffah Public School & College", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.schoolAddress || "Saidu Sharif, Swat - Pakistan", pageWidth / 2, 23, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("EXAMINATION ROLL NUMBER SLIP", pageWidth / 2, 31, { align: "center" });

  // Photo box (right side)
  const photoX = pageWidth - 50;
  const photoY = 45;
  const photoWidth = 30;
  const photoHeight = 40;

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
  let yPos = 50;
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

  // Exam schedule table
  yPos = 100;
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

  // Instructions
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text("INSTRUCTIONS:", leftMargin, finalY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const instructions = [
    "1. Bring this slip to the examination hall.",
    "2. Students must be present 15 minutes before exam time.",
    "3. No electronic devices are allowed in the examination hall.",
    "4. Students should bring their own stationery.",
  ];

  instructions.forEach((instruction, index) => {
    doc.text(instruction, leftMargin, finalY + 8 + index * 6);
  });

  // Footer with signatures
  const footerY = doc.internal.pageSize.getHeight() - 30;
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(...grayColor);
  doc.line(leftMargin, footerY, leftMargin + 50, footerY);
  doc.line(pageWidth - leftMargin - 50, footerY, pageWidth - leftMargin, footerY);

  doc.setFontSize(9);
  doc.text("Principal's Signature", leftMargin, footerY + 6);
  doc.text("Controller of Examination", pageWidth - leftMargin - 50, footerY + 6);

  return doc;
};

export const downloadRollNumberSlip = async (data: RollNumberSlipData) => {
  const doc = await generateRollNumberSlipPdf(data);
  doc.save(`RollNumberSlip-${data.studentId}.pdf`);
};

export const generateClassRollNumberSlips = async (students: RollNumberSlipData[]) => {
  // Generate all in one doc
  const combinedDoc = new jsPDF();
  const pageWidth = combinedDoc.internal.pageSize.getWidth();
  const primaryColor: [number, number, number] = [30, 64, 175];
  const darkColor: [number, number, number] = [30, 30, 30];
  const grayColor: [number, number, number] = [100, 100, 100];

  for (let i = 0; i < students.length; i++) {
    if (i > 0) combinedDoc.addPage();
    
    const data = students[i];
    
    // Header
    combinedDoc.setFillColor(...primaryColor);
    combinedDoc.rect(0, 0, pageWidth, 35, "F");

    combinedDoc.setTextColor(255, 255, 255);
    combinedDoc.setFontSize(18);
    combinedDoc.setFont("helvetica", "bold");
    combinedDoc.text(data.schoolName || "The Suffah Public School & College", pageWidth / 2, 15, { align: "center" });

    combinedDoc.setFontSize(10);
    combinedDoc.setFont("helvetica", "normal");
    combinedDoc.text(data.schoolAddress || "Saidu Sharif, Swat - Pakistan", pageWidth / 2, 23, { align: "center" });

    combinedDoc.setFontSize(12);
    combinedDoc.setFont("helvetica", "bold");
    combinedDoc.text("EXAMINATION ROLL NUMBER SLIP", pageWidth / 2, 31, { align: "center" });

    // Photo box
    const photoX = pageWidth - 50;
    const photoY = 45;
    const photoWidth = 30;
    const photoHeight = 40;

    combinedDoc.setDrawColor(...grayColor);
    combinedDoc.setLineWidth(0.5);
    combinedDoc.rect(photoX, photoY, photoWidth, photoHeight);
    combinedDoc.setFontSize(8);
    combinedDoc.setTextColor(...grayColor);
    combinedDoc.text("Photo", photoX + photoWidth / 2, photoY + photoHeight / 2, { align: "center" });

    // Student details
    let yPos = 50;
    const leftMargin = 20;

    combinedDoc.setTextColor(...darkColor);
    combinedDoc.setFontSize(11);

    const details = [
      { label: "Student Name:", value: data.studentName },
      { label: "Father's Name:", value: data.fatherName || "-" },
      { label: "Student ID:", value: data.studentId },
      { label: "Roll Number:", value: data.rollNumber || data.studentId },
      { label: "Class:", value: `${data.className}${data.section ? ` - ${data.section}` : ""}` },
      { label: "Examination:", value: data.examName },
    ];

    details.forEach((detail) => {
      combinedDoc.setFont("helvetica", "bold");
      combinedDoc.text(detail.label, leftMargin, yPos);
      combinedDoc.setFont("helvetica", "normal");
      combinedDoc.text(detail.value, leftMargin + 40, yPos);
      yPos += 8;
    });

    // Exam schedule
    yPos = 100;
    combinedDoc.setFont("helvetica", "bold");
    combinedDoc.setFontSize(12);
    combinedDoc.setTextColor(...primaryColor);
    combinedDoc.text("EXAMINATION SCHEDULE", leftMargin, yPos);

    autoTable(combinedDoc, {
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
      margin: { left: leftMargin, right: leftMargin },
    });

    // Instructions
    const finalY = (combinedDoc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    
    combinedDoc.setFontSize(10);
    combinedDoc.setFont("helvetica", "bold");
    combinedDoc.setTextColor(...darkColor);
    combinedDoc.text("INSTRUCTIONS:", leftMargin, finalY);

    combinedDoc.setFont("helvetica", "normal");
    combinedDoc.setFontSize(9);
    const instructions = [
      "1. Bring this slip to the examination hall.",
      "2. Students must be present 15 minutes before exam time.",
      "3. No electronic devices are allowed in the examination hall.",
    ];

    instructions.forEach((instruction, index) => {
      combinedDoc.text(instruction, leftMargin, finalY + 8 + index * 6);
    });

    // Footer
    const footerY = combinedDoc.internal.pageSize.getHeight() - 30;
    combinedDoc.setLineWidth(0.5);
    combinedDoc.setDrawColor(...grayColor);
    combinedDoc.line(leftMargin, footerY, leftMargin + 50, footerY);
    combinedDoc.line(pageWidth - leftMargin - 50, footerY, pageWidth - leftMargin, footerY);
    combinedDoc.setFontSize(9);
    combinedDoc.setTextColor(...darkColor);
    combinedDoc.text("Principal's Signature", leftMargin, footerY + 6);
    combinedDoc.text("Controller of Examination", pageWidth - leftMargin - 50, footerY + 6);
  }

  return combinedDoc;
};

export const downloadClassRollNumberSlips = async (students: RollNumberSlipData[], className: string) => {
  const doc = await generateClassRollNumberSlips(students);
  doc.save(`RollNumberSlips-${className.replace(/\s+/g, "-")}.pdf`);
};
