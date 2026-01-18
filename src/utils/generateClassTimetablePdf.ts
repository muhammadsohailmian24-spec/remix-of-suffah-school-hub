import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface TimetableEntry {
  day: number;
  dayName: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
  roomNumber?: string;
}

export interface ClassTimetablePdfData {
  className: string;
  section?: string;
  entries: TimetableEntry[];
  generatedDate?: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const formattedHour = h % 12 || 12;
  return `${formattedHour}:${minutes} ${ampm}`;
};

// Shared PDF styling utilities
const addWatermark = (doc: jsPDF) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    logoImg.src = "/images/school-logo.png";
    
    doc.setGState(doc.GState({ opacity: 0.05 }));
    doc.addImage(logoImg, "PNG", pageWidth / 2 - 40, pageHeight / 2 - 40, 80, 80);
    doc.setGState(doc.GState({ opacity: 1 }));
  } catch (e) {
    // Continue without watermark
  }
};

const addCircularDecorations = (doc: jsPDF, primaryColor: [number, number, number], accentColor: [number, number, number]) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFillColor(...primaryColor);
  doc.setGState(doc.GState({ opacity: 0.08 }));
  doc.circle(pageWidth + 30, -30, 80, "F");
  doc.setGState(doc.GState({ opacity: 0.12 }));
  doc.circle(pageWidth - 20, 20, 40, "F");
  
  doc.setGState(doc.GState({ opacity: 0.06 }));
  doc.circle(-40, pageHeight + 40, 90, "F");
  doc.setGState(doc.GState({ opacity: 0.1 }));
  doc.circle(30, pageHeight - 15, 50, "F");
  
  doc.setFillColor(...accentColor);
  doc.setGState(doc.GState({ opacity: 0.08 }));
  doc.circle(pageWidth - 60, pageHeight - 30, 30, "F");
  
  doc.setGState(doc.GState({ opacity: 1 }));
};

export const generateClassTimetablePdf = async (data: ClassTimetablePdfData): Promise<jsPDF> => {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors - Royal Blue and Gold theme
  const primaryColor: [number, number, number] = [30, 64, 124];
  const goldColor: [number, number, number] = [184, 134, 11];
  const darkColor: [number, number, number] = [30, 30, 30];

  // Add watermark and decorations
  addWatermark(doc);
  addCircularDecorations(doc, primaryColor, goldColor);

  // Header background
  doc.setFillColor(...primaryColor);
  doc.roundedRect(0, 0, pageWidth, 38, 0, 0, "F");
  
  // Gold accent stripe
  doc.setFillColor(...goldColor);
  doc.rect(0, 38, pageWidth, 2, "F");
  
  // Decorative circles in header
  doc.setFillColor(255, 255, 255);
  doc.setGState(doc.GState({ opacity: 0.08 }));
  doc.circle(pageWidth - 40, 19, 50, "F");
  doc.circle(pageWidth - 80, 5, 30, "F");
  doc.setGState(doc.GState({ opacity: 1 }));

  // Add circular logo container
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => {
        doc.setFillColor(255, 255, 255);
        doc.circle(25, 19, 14, "F");
        
        doc.setDrawColor(...goldColor);
        doc.setLineWidth(1.2);
        doc.circle(25, 19, 14, "S");
        
        doc.addImage(logoImg, "PNG", 12, 6, 26, 26);
        resolve();
      };
      logoImg.onerror = reject;
      logoImg.src = "/images/school-logo.png";
    });
  } catch (e) {
    doc.setFillColor(255, 255, 255);
    doc.circle(25, 19, 14, "F");
  }

  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("The Suffah Public School & College", 46, 14);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setGState(doc.GState({ opacity: 0.9 }));
  doc.text("Excellence in Education", 46, 21);
  doc.setGState(doc.GState({ opacity: 1 }));

  // Document title
  const classDisplay = data.section 
    ? `${data.className} - Section ${data.section}` 
    : data.className;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Class Timetable - ${classDisplay}`, 46, 32);

  // Date info with decorative box
  const generatedDate = data.generatedDate || new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(pageWidth - 80, 44, 70, 10, 2, 2, "F");
  doc.setTextColor(...darkColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${generatedDate}`, pageWidth - 75, 50);

  // Get unique time slots
  const timeSlots = [...new Set(data.entries.map(e => `${e.startTime}-${e.endTime}`))]
    .sort((a, b) => a.localeCompare(b));

  // Create timetable grid
  const tableData: string[][] = [];
  
  DAYS.forEach((day, dayIndex) => {
    const row: string[] = [day];
    timeSlots.forEach(slot => {
      const [start, end] = slot.split("-");
      const entry = data.entries.find(e => 
        e.day === dayIndex + 1 && e.startTime === start && e.endTime === end
      );
      if (entry) {
        row.push(`${entry.subjectName}\n${entry.teacherName}${entry.roomNumber ? `\n(${entry.roomNumber})` : ""}`);
      } else {
        row.push("-");
      }
    });
    tableData.push(row);
  });

  // Table headers
  const headers = ["Day", ...timeSlots.map(slot => {
    const [start, end] = slot.split("-");
    return `${formatTime(start)}\nto\n${formatTime(end)}`;
  })];

  autoTable(doc, {
    startY: 58,
    head: [headers],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      valign: "middle",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 40],
      halign: "center",
      valign: "middle",
      minCellHeight: 18,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 28, fillColor: [235, 240, 250] },
    },
    alternateRowStyles: {
      fillColor: [250, 252, 255],
    },
    margin: { left: 12, right: 12 },
  });

  // Footer
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(0.5);
  doc.line(20, pageHeight - 14, pageWidth - 20, pageHeight - 14);
  
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "normal");
  doc.text("The Suffah Public School & College • Madyan Swat, Pakistan", 20, pageHeight - 8);
  
  // Page number badge
  doc.setFillColor(...primaryColor);
  doc.circle(pageWidth - 25, pageHeight - 10, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("1", pageWidth - 25, pageHeight - 8, { align: "center" });

  return doc;
};

export const downloadClassTimetablePdf = async (data: ClassTimetablePdfData): Promise<void> => {
  const doc = await generateClassTimetablePdf(data);
  const className = data.section 
    ? `${data.className}-${data.section}` 
    : data.className;
  doc.save(`Timetable_${className.replace(/\s+/g, "_")}.pdf`);
};
