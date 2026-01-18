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

// Shared PDF styling utilities
const addWatermark = (doc: jsPDF) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    logoImg.src = "/images/school-logo.png";
    
    doc.setGState(doc.GState({ opacity: 0.06 }));
    doc.addImage(logoImg, "PNG", pageWidth / 2 - 50, pageHeight / 2 - 50, 100, 100);
    doc.setGState(doc.GState({ opacity: 1 }));
  } catch (e) {
    // Continue without watermark
  }
};

const addCircularDecorations = (doc: jsPDF, primaryColor: [number, number, number], accentColor: [number, number, number]) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFillColor(...primaryColor);
  doc.setGState(doc.GState({ opacity: 0.1 }));
  doc.circle(pageWidth + 20, -20, 60, "F");
  doc.setGState(doc.GState({ opacity: 0.15 }));
  doc.circle(pageWidth - 15, 25, 35, "F");
  
  doc.setGState(doc.GState({ opacity: 0.08 }));
  doc.circle(-30, pageHeight + 30, 70, "F");
  doc.setGState(doc.GState({ opacity: 0.12 }));
  doc.circle(25, pageHeight - 20, 40, "F");
  
  doc.setFillColor(...accentColor);
  doc.setGState(doc.GState({ opacity: 0.1 }));
  doc.circle(pageWidth - 50, pageHeight - 40, 25, "F");
  
  doc.setGState(doc.GState({ opacity: 1 }));
};

const addFooter = (doc: jsPDF, primaryColor: [number, number, number], goldColor: [number, number, number]) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(0.5);
    doc.line(20, pageHeight - 18, pageWidth - 20, pageHeight - 18);
    
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "normal");
    doc.text("The Suffah Public School & College • Madyan Swat, Pakistan", 20, pageHeight - 12);
    
    doc.setFillColor(...primaryColor);
    doc.circle(pageWidth / 2, pageHeight - 12, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${i}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text(`of ${pageCount}`, pageWidth / 2 + 12, pageHeight - 12);
  }
};

export const generateClassResultsPdf = async (data: ClassResultsPdfData): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Colors - Royal Blue and Gold theme
  const primaryColor: [number, number, number] = [30, 64, 124];
  const goldColor: [number, number, number] = [184, 134, 11];
  const darkColor: [number, number, number] = [30, 30, 30];
  const greenColor: [number, number, number] = [34, 139, 34];
  const redColor: [number, number, number] = [220, 53, 69];

  // Add watermark and decorations
  addWatermark(doc);
  addCircularDecorations(doc, primaryColor, goldColor);

  // Header background
  doc.setFillColor(...primaryColor);
  doc.roundedRect(0, 0, pageWidth, 50, 0, 0, "F");
  
  // Gold accent stripe
  doc.setFillColor(...goldColor);
  doc.rect(0, 50, pageWidth, 3, "F");
  
  // Decorative circles in header
  doc.setFillColor(255, 255, 255);
  doc.setGState(doc.GState({ opacity: 0.08 }));
  doc.circle(pageWidth - 30, 25, 45, "F");
  doc.circle(pageWidth - 60, 10, 25, "F");
  doc.setGState(doc.GState({ opacity: 1 }));

  // Add circular logo container
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => {
        doc.setFillColor(255, 255, 255);
        doc.circle(30, 25, 18, "F");
        
        doc.setDrawColor(...goldColor);
        doc.setLineWidth(1.5);
        doc.circle(30, 25, 18, "S");
        
        doc.addImage(logoImg, "PNG", 14, 9, 32, 32);
        resolve();
      };
      logoImg.onerror = reject;
      logoImg.src = "/images/school-logo.png";
    });
  } catch (e) {
    doc.setFillColor(255, 255, 255);
    doc.circle(30, 25, 18, "F");
  }

  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("The Suffah Public School & College", 55, 18);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setGState(doc.GState({ opacity: 0.9 }));
  doc.text("Excellence in Education", 55, 26);
  doc.setGState(doc.GState({ opacity: 1 }));

  // Document title
  const classDisplay = data.section 
    ? `${data.className} - Section ${data.section}` 
    : data.className;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Class Results - ${classDisplay}`, 55, 38);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...goldColor);
  doc.text(`${data.examName} | ${data.subjectName}`, 55, 46);

  // Stats row
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

  // Stats boxes
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(15, 58, pageWidth - 30, 16, 3, 3, "F");
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Exam Date: ${data.examDate}`, 20, 65);
  
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${data.results.length}`, 70, 65);
  
  doc.setTextColor(...greenColor);
  doc.text(`Pass: ${passCount}`, 100, 65);
  
  doc.setTextColor(...redColor);
  doc.text(`Fail: ${failCount}`, 130, 65);
  
  doc.setTextColor(...primaryColor);
  doc.text(`Avg: ${avgPercentage}%`, 155, 65);
  
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${generatedDate}`, pageWidth - 20, 65, { align: "right" });

  // Decorative circles for stats
  doc.setFillColor(...greenColor);
  doc.setGState(doc.GState({ opacity: 0.15 }));
  doc.circle(95, 66, 3, "F");
  doc.setFillColor(...redColor);
  doc.circle(125, 66, 3, "F");
  doc.setGState(doc.GState({ opacity: 1 }));

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
    startY: 80,
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
      fillColor: [245, 248, 252],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 15, fontStyle: "bold" },
      1: { cellWidth: 22 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { halign: "center", cellWidth: 20 },
      5: { halign: "center", cellWidth: 15 },
      6: { halign: "center", cellWidth: 15 },
      7: { halign: "center", cellWidth: 18 },
    },
    didParseCell: (data) => {
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
    margin: { left: 15, right: 15 },
    didDrawPage: () => {
      addWatermark(doc);
      addCircularDecorations(doc, primaryColor, goldColor);
    },
  });

  // Footer
  addFooter(doc, primaryColor, goldColor);

  return doc;
};

export const downloadClassResultsPdf = async (data: ClassResultsPdfData): Promise<void> => {
  const doc = await generateClassResultsPdf(data);
  const className = data.section 
    ? `${data.className}-${data.section}` 
    : data.className;
  doc.save(`Results_${className.replace(/\s+/g, "_")}_${data.examName.replace(/\s+/g, "_")}.pdf`);
};
