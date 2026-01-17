import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface StudentResult {
  rollNumber: number;
  studentId: string;
  studentName: string;
  fatherName: string;
  marksObtained: number;
  maxMarks: number;
  grade: string;
  percentage: number;
}

export interface ClassResultsPdfData {
  className: string;
  section?: string;
  examName: string;
  subjectName: string;
  examDate: string;
  results: StudentResult[];
  generatedDate?: string;
}

export const generateClassResultsPdf = async (data: ClassResultsPdfData): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Colors
  const primaryColor: [number, number, number] = [30, 100, 180];
  const darkColor: [number, number, number] = [30, 30, 30];
  const greenColor: [number, number, number] = [34, 139, 34];
  const redColor: [number, number, number] = [220, 53, 69];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");

  // Add logo
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => {
        doc.addImage(logoImg, "PNG", 10, 5, 30, 30);
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
  doc.text("The Suffah Public School & College", 45, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Excellence in Education", 45, 21);

  // Document title
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const classDisplay = data.section 
    ? `${data.className} - Section ${data.section}` 
    : data.className;
  doc.text(`Class Results - ${classDisplay}`, 45, 30);
  doc.setFontSize(10);
  doc.text(`${data.examName} | ${data.subjectName}`, 45, 37);

  // Stats row
  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const passCount = data.results.filter(r => r.percentage >= 40).length;
  const failCount = data.results.length - passCount;
  const avgPercentage = data.results.length > 0
    ? (data.results.reduce((sum, r) => sum + r.percentage, 0) / data.results.length).toFixed(1)
    : "0";

  const generatedDate = data.generatedDate || new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  doc.text(`Exam Date: ${data.examDate}`, 15, 50);
  doc.text(`Total Students: ${data.results.length}`, 80, 50);
  doc.text(`Pass: ${passCount} | Fail: ${failCount} | Avg: ${avgPercentage}%`, 130, 50);
  doc.text(`Generated: ${generatedDate}`, pageWidth - 15, 50, { align: "right" });

  // Table
  const tableData = data.results.map((result) => {
    const isPassed = result.percentage >= 40;
    return [
      result.rollNumber.toString(),
      result.studentId,
      result.studentName,
      result.fatherName,
      `${result.marksObtained}/${result.maxMarks}`,
      `${result.percentage.toFixed(1)}%`,
      result.grade,
      isPassed ? "PASS" : "FAIL",
    ];
  });

  autoTable(doc, {
    startY: 58,
    head: [["Roll No.", "ID", "Name", "Father Name", "Marks", "%", "Grade", "Status"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 40],
    },
    alternateRowStyles: {
      fillColor: [245, 250, 255],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 15 },
      1: { cellWidth: 22 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { halign: "center", cellWidth: 20 },
      5: { halign: "center", cellWidth: 15 },
      6: { halign: "center", cellWidth: 15 },
      7: { halign: "center", cellWidth: 18 },
    },
    didParseCell: (data) => {
      // Color the status column based on pass/fail
      if (data.section === "body" && data.column.index === 7) {
        if (data.cell.text[0] === "PASS") {
          data.cell.styles.textColor = greenColor;
          data.cell.styles.fontStyle = "bold";
        } else if (data.cell.text[0] === "FAIL") {
          data.cell.styles.textColor = redColor;
          data.cell.styles.fontStyle = "bold";
        }
      }
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

export const downloadClassResultsPdf = async (data: ClassResultsPdfData): Promise<void> => {
  const doc = await generateClassResultsPdf(data);
  const className = data.section 
    ? `${data.className}-${data.section}` 
    : data.className;
  doc.save(`Results_${className.replace(/\s+/g, "_")}_${data.examName.replace(/\s+/g, "_")}.pdf`);
};
