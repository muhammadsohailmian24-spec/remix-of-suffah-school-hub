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

// Shared PDF styling utilities
const addWatermark = (doc: jsPDF) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Create watermark logo in center
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    logoImg.src = "/images/school-logo.png";
    
    // Add centered watermark with low opacity
    doc.setGState(doc.GState({ opacity: 0.06 }));
    doc.addImage(logoImg, "PNG", pageWidth / 2 - 50, pageHeight / 2 - 50, 100, 100);
    doc.setGState(doc.GState({ opacity: 1 }));
  } catch (e) {
    // Continue without watermark
  }
};

const addCircularDecorations = (doc: jsPDF, primaryColor: [number, number, number], accentColor: [number, number, number]) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Top-right decorative circles
  doc.setFillColor(...primaryColor);
  doc.setGState(doc.GState({ opacity: 0.1 }));
  doc.circle(pageWidth + 20, -20, 60, "F");
  doc.setGState(doc.GState({ opacity: 0.15 }));
  doc.circle(pageWidth - 15, 25, 35, "F");
  
  // Bottom-left decorative circles
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setGState(doc.GState({ opacity: 0.08 }));
  doc.circle(-30, pageHeight + 30, 70, "F");
  doc.setGState(doc.GState({ opacity: 0.12 }));
  doc.circle(25, pageHeight - 20, 40, "F");
  
  // Accent circle
  doc.setFillColor(...accentColor);
  doc.setGState(doc.GState({ opacity: 0.1 }));
  doc.circle(pageWidth - 50, pageHeight - 40, 25, "F");
  
  doc.setGState(doc.GState({ opacity: 1 }));
};

const addHeader = async (doc: jsPDF, title: string, subtitle: string, primaryColor: [number, number, number], goldColor: [number, number, number]) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background with gradient effect (using multiple rectangles)
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
        // Draw circular white background for logo
        doc.setFillColor(255, 255, 255);
        doc.circle(30, 25, 18, "F");
        
        // Gold ring around logo
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
    // Draw placeholder circle
    doc.setFillColor(255, 255, 255);
    doc.circle(30, 25, 18, "F");
  }
  
  // School name with elegant typography
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("The Suffah Public School & College", 55, 18);
  
  // Tagline
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setGState(doc.GState({ opacity: 0.9 }));
  doc.text("Excellence in Education", 55, 26);
  doc.setGState(doc.GState({ opacity: 1 }));
  
  // Document title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 55, 38);
  
  // Subtitle (class info)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...goldColor);
  doc.text(subtitle, 55, 46);
};

const addFooter = (doc: jsPDF, primaryColor: [number, number, number], goldColor: [number, number, number]) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(0.5);
    doc.line(20, pageHeight - 18, pageWidth - 20, pageHeight - 18);
    
    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "normal");
    doc.text("The Suffah Public School & College • Madyan Swat, Pakistan", 20, pageHeight - 12);
    
    // Page number in circular badge
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

export const generateStudentListPdf = async (data: StudentListPdfData): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Colors - Royal Blue and Gold theme
  const primaryColor: [number, number, number] = [30, 64, 124];
  const goldColor: [number, number, number] = [184, 134, 11];
  const darkColor: [number, number, number] = [30, 30, 30];

  // Add watermark first (so it's behind content)
  addWatermark(doc);
  
  // Add circular decorations
  addCircularDecorations(doc, primaryColor, goldColor);

  // Add header
  const classDisplay = data.section 
    ? `${data.className} - Section ${data.section}` 
    : data.className;
  await addHeader(doc, "Student List", classDisplay, primaryColor, goldColor);

  // Info row with decorative styling
  const generatedDate = data.generatedDate || new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(15, 58, pageWidth - 30, 12, 3, 3, "F");
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Students: ${data.students.length}`, 20, 66);
  
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on: ${generatedDate}`, pageWidth - 20, 66, { align: "right" });

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
    startY: 75,
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
      fillColor: [245, 248, 252],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 18, fontStyle: "bold" },
      1: { cellWidth: 25 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 45 },
      5: { cellWidth: 25 },
    },
    margin: { left: 15, right: 15 },
    didDrawPage: () => {
      // Add watermark to each new page
      addWatermark(doc);
      addCircularDecorations(doc, primaryColor, goldColor);
    },
  });

  // Footer
  addFooter(doc, primaryColor, goldColor);

  return doc;
};

export const downloadStudentListPdf = async (data: StudentListPdfData): Promise<void> => {
  const doc = await generateStudentListPdf(data);
  const className = data.section 
    ? `${data.className}-${data.section}` 
    : data.className;
  doc.save(`Student_List_${className.replace(/\s+/g, "_")}.pdf`);
};
