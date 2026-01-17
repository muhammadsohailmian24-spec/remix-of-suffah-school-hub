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

export const generateClassTimetablePdf = async (data: ClassTimetablePdfData): Promise<jsPDF> => {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Colors
  const primaryColor: [number, number, number] = [30, 100, 180];
  const darkColor: [number, number, number] = [30, 30, 30];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 30, "F");

  // Add logo
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => {
        doc.addImage(logoImg, "PNG", 10, 3, 24, 24);
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
  doc.setFontSize(16);
  doc.text("The Suffah Public School & College", 40, 12);

  const classDisplay = data.section 
    ? `${data.className} - Section ${data.section}` 
    : data.className;
  doc.setFontSize(12);
  doc.text(`Class Timetable - ${classDisplay}`, 40, 22);

  // Date info
  doc.setTextColor(...darkColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const generatedDate = data.generatedDate || new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(`Generated: ${generatedDate}`, pageWidth - 15, 38, { align: "right" });

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
    startY: 42,
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
      0: { fontStyle: "bold", cellWidth: 25 },
    },
    alternateRowStyles: {
      fillColor: [245, 250, 255],
    },
    margin: { left: 10, right: 10 },
  });

  return doc;
};

export const downloadClassTimetablePdf = async (data: ClassTimetablePdfData): Promise<void> => {
  const doc = await generateClassTimetablePdf(data);
  const className = data.section 
    ? `${data.className}-${data.section}` 
    : data.className;
  doc.save(`Timetable_${className.replace(/\s+/g, "_")}.pdf`);
};
