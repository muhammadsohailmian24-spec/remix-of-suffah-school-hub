import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadLogo, addWatermark, drawStyledFooter, primaryColor, goldColor, darkColor, grayColor } from "./pdfDesignUtils";

interface StudentResult {
  position: number;
  rollNumber: string;
  studentId: string;
  name: string;
  subjects: { name: string; obtained: number; max: number; grade?: string }[];
  totalMarks: number;
  totalMax: number;
  percentage: string;
  grade?: string;
  feedback?: string;
}

interface ClassResult {
  className: string;
  section?: string;
  students: StudentResult[];
}

export interface GazetteBookData {
  examName: string;
  session: string;
  schoolName?: string;
  schoolAddress?: string;
  generatedDate?: string;
  classes: ClassResult[];
  allSubjects: string[];
}

export const generateGazetteBookPdf = async (data: GazetteBookData) => {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoImg = await loadLogo();
  const margin = 10;

  let currentPage = 1;
  const totalPages = data.classes.length + 1; // Cover + each class

  // ========== COVER PAGE ==========
  await addWatermark(doc);

  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, "F");

  // Gold accent stripe
  doc.setFillColor(...goldColor);
  doc.rect(0, 50, pageWidth, 3, "F");

  // Logo
  if (logoImg) {
    const logoSize = 35;
    doc.setFillColor(255, 255, 255);
    doc.circle(pageWidth / 2, 25, logoSize / 2 + 2, "F");
    doc.addImage(logoImg, "PNG", pageWidth / 2 - logoSize / 2, 7, logoSize, logoSize);
  }

  // School name below header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.schoolName || "THE SUFFAH PUBLIC SCHOOL & COLLEGE", pageWidth / 2, 65, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text(data.schoolAddress || "Madyan Swat, Pakistan", pageWidth / 2, 73, { align: "center" });

  // Title box
  const titleY = 95;
  doc.setFillColor(...primaryColor);
  doc.roundedRect(pageWidth / 2 - 80, titleY - 8, 160, 22, 4, 4, "F");
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("GAZETTE BOOK", pageWidth / 2, titleY + 5, { align: "center" });

  // Exam info
  doc.setFontSize(14);
  doc.setTextColor(...darkColor);
  doc.text(`${data.examName.toUpperCase()} EXAMINATION`, pageWidth / 2, titleY + 28, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(...grayColor);
  doc.text(`Session: ${data.session}`, pageWidth / 2, titleY + 40, { align: "center" });

  // Summary info
  const summaryY = titleY + 60;
  const totalStudents = data.classes.reduce((sum, c) => sum + c.students.length, 0);

  doc.setFillColor(250, 250, 252);
  doc.roundedRect(margin + 40, summaryY - 5, pageWidth - margin * 2 - 80, 30, 3, 3, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Total Classes:", margin + 50, summaryY + 8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(String(data.classes.length), margin + 85, summaryY + 8);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Total Students:", margin + 120, summaryY + 8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(String(totalStudents), margin + 160, summaryY + 8);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Generated:", margin + 200, summaryY + 8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(data.generatedDate || new Date().toLocaleDateString("en-GB"), margin + 235, summaryY + 8);

  // Table of Contents
  const tocY = summaryY + 45;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text("Contents:", margin + 50, tocY);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  data.classes.forEach((cls, idx) => {
    const yPos = tocY + 8 + idx * 6;
    if (yPos < pageHeight - 30) {
      doc.setTextColor(...grayColor);
      doc.text(`${idx + 1}. ${cls.className} ${cls.section || ""}`, margin + 55, yPos);
      doc.text(`(${cls.students.length} students)`, margin + 130, yPos);
    }
  });

  drawStyledFooter(doc, currentPage, totalPages, data.schoolAddress || "Madyan Swat, Pakistan");

  // ========== CLASS PAGES ==========
  for (const classData of data.classes) {
    doc.addPage("landscape");
    currentPage++;
    await addWatermark(doc);

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 25, "F");
    doc.setFillColor(...goldColor);
    doc.rect(0, 25, pageWidth, 2, "F");

    if (logoImg) {
      doc.addImage(logoImg, "PNG", margin, 3, 20, 20);
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(data.schoolName || "THE SUFFAH PUBLIC SCHOOL & COLLEGE", pageWidth / 2, 12, { align: "center" });

    doc.setFontSize(10);
    doc.text(`${data.examName.toUpperCase()} - ${data.session}`, pageWidth / 2, 20, { align: "center" });

    // Class title
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text(`Class: ${classData.className} ${classData.section || ""}`, margin, 35);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayColor);
    doc.text(`Total Students: ${classData.students.length}`, pageWidth - margin - 50, 35);

    // Build table columns - Position, Roll No, Name, then each subject, then Total, Max, %, Grade
    const subjectNames = data.allSubjects;
    const tableHead = [
      "Pos",
      "Roll No",
      "Student Name",
      ...subjectNames,
      "Total",
      "Max",
      "%",
      "Grade"
    ];

    const tableBody = classData.students.map((student) => {
      const subjectMarks = subjectNames.map((subName) => {
        const sub = student.subjects.find((s) => s.name === subName);
        return sub ? String(sub.obtained) : "-";
      });

      return [
        String(student.position),
        student.rollNumber || student.studentId || "-",
        student.name,
        ...subjectMarks,
        String(student.totalMarks),
        String(student.totalMax),
        `${student.percentage}%`,
        student.grade || "-"
      ];
    });

    // Calculate column widths dynamically
    const fixedColWidth = 12;
    const nameColWidth = 35;
    const subjectColWidth = Math.min(18, (pageWidth - margin * 2 - fixedColWidth * 6 - nameColWidth) / subjectNames.length);

    const columnStyles: { [key: number]: { cellWidth: number; halign?: "left" | "center" | "right" } } = {
      0: { cellWidth: fixedColWidth, halign: "center" }, // Pos
      1: { cellWidth: 18, halign: "center" }, // Roll No
      2: { cellWidth: nameColWidth }, // Name
    };

    subjectNames.forEach((_, idx) => {
      columnStyles[3 + idx] = { cellWidth: subjectColWidth, halign: "center" };
    });

    const lastCols = [
      { cellWidth: 14, halign: "center" as const }, // Total
      { cellWidth: 14, halign: "center" as const }, // Max
      { cellWidth: 14, halign: "center" as const }, // %
      { cellWidth: 16, halign: "center" as const }, // Grade
    ];

    lastCols.forEach((col, idx) => {
      columnStyles[3 + subjectNames.length + idx] = col;
    });

    autoTable(doc, {
      startY: 40,
      head: [tableHead],
      body: tableBody,
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 7,
        textColor: darkColor,
      },
      columnStyles,
      margin: { left: margin, right: margin },
      theme: "grid",
      didParseCell: (cellData) => {
        // Highlight top 3 positions
        if (cellData.column.index === 0 && cellData.section === "body") {
          const pos = parseInt(cellData.cell.raw as string);
          if (pos === 1) {
            cellData.cell.styles.fillColor = [255, 215, 0]; // Gold
            cellData.cell.styles.fontStyle = "bold";
          } else if (pos === 2) {
            cellData.cell.styles.fillColor = [192, 192, 192]; // Silver
          } else if (pos === 3) {
            cellData.cell.styles.fillColor = [205, 127, 50]; // Bronze
          }
        }
      },
    });

    drawStyledFooter(doc, currentPage, totalPages, data.schoolAddress || "Madyan Swat, Pakistan");
  }

  return doc;
};

export const downloadGazetteBook = async (data: GazetteBookData) => {
  const doc = await generateGazetteBookPdf(data);
  doc.save(`Gazette-Book-${data.examName}-${data.session}.pdf`);
};
