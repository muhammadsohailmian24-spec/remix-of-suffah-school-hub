import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface StudentListData {
  rollNumber: number;
  studentId: string;
  studentName: string;
  fatherName: string;
  address?: string;
  phone?: string;
}

export interface StudentListPdfData {
  className: string;
  section?: string;
  students: StudentListData[];
  generatedDate?: string;
}

export const generateStudentListPdf = async (data: StudentListPdfData): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Colors
  const primaryColor: [number, number, number] = [30, 100, 180];
  const darkColor: [number, number, number] = [30, 30, 30];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, "F");

  // Add logo
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => {
        doc.addImage(logoImg, "PNG", 10, 5, 25, 25);
        resolve();
      };
      logoImg.onerror = reject;
      logoImg.src = "/images/school-logo.png";
    });
  } catch (e) {
    // Continue without logo
  }

  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("The Suffah Public School & College", 42, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Excellence in Education", 42, 22);

  // Document title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const classDisplay = data.section 
    ? `${data.className} - Section ${data.section}` 
    : data.className;
  doc.text(`Student List - ${classDisplay}`, 42, 30);

  // Date info
  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const generatedDate = data.generatedDate || new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(`Generated on: ${generatedDate}`, pageWidth - 15, 45, { align: "right" });
  doc.text(`Total Students: ${data.students.length}`, 15, 45);

  // Table
  const tableData = data.students.map((student) => [
    student.rollNumber.toString(),
    student.studentId,
    student.studentName,
    student.fatherName,
    student.address || "-",
    student.phone || "-",
  ]);

  autoTable(doc, {
    startY: 55,
    head: [["Roll No.", "Student ID", "Name", "Father Name", "Address", "Phone"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [40, 40, 40],
    },
    alternateRowStyles: {
      fillColor: [245, 250, 255],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 18 },
      1: { cellWidth: 25 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 45 },
      5: { cellWidth: 25 },
    },
    margin: { left: 10, right: 10 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  return doc;
};

export const downloadStudentListPdf = async (data: StudentListPdfData): Promise<void> => {
  const doc = await generateStudentListPdf(data);
  const className = data.section 
    ? `${data.className}-${data.section}` 
    : data.className;
  doc.save(`Student_List_${className.replace(/\s+/g, "_")}.pdf`);
};
