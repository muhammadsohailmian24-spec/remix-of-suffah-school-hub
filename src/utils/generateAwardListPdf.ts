import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadLogo, addWatermark, drawStyledFooter, primaryColor, goldColor, darkColor, grayColor } from './pdfDesignUtils';

interface StudentInfo {
  sr_no: number;
  student_id: string;
  name: string;
  father_name: string;
  theory_marks?: number | string;
  practical_marks?: number | string;
  total_marks?: number | string;
}

export interface AwardListData {
  session: string;
  date: string;
  className: string;
  section: string;
  subject: string;
  teacherName: string;
  maxMarks: string;
  students: StudentInfo[];
}

export const generateAwardListPdf = async (data: AwardListData): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const logoImg = await loadLogo();
  
  // Add watermark
  await addWatermark(doc);

  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 38, "F");
  
  // Gold accent stripe
  doc.setFillColor(...goldColor);
  doc.rect(0, 38, pageWidth, 2, "F");
  
  // Decorative circles in header
  doc.setFillColor(255, 255, 255);
  doc.circle(pageWidth - 18, 10, 22, 'F');
  doc.circle(pageWidth - 40, -5, 15, 'F');
  doc.circle(18, 30, 10, 'F');

  // Circular logo with gold ring
  if (logoImg) {
    const logoSize = 26;
    const logoX = margin;
    const logoY = 6;
    
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(1.5);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2);
    
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 0.5, 'F');
    
    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }

  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('The Suffah Public School & College', pageWidth / 2 + 10, 14, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('PSRA Reg. No. 200445000302 | BISE Reg. No. 434-B/Swat-C', pageWidth / 2 + 10, 22, { align: 'center' });
  doc.text('Madyan Swat, Pakistan', pageWidth / 2 + 10, 28, { align: 'center' });

  const startY = 48;

  // Award List title box with rounded corners
  const titleWidth = 58;
  const titleX = pageWidth / 2 - titleWidth / 2;
  doc.setFillColor(...primaryColor);
  doc.roundedRect(titleX, startY - 6, titleWidth, 10, 5, 5, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Subject Wise Award-List', pageWidth / 2, startY, { align: 'center' });

  // Info rows with styled layout - FIXED: using proper text rendering
  const row1Y = startY + 16;
  
  // Row 1: Session, Date, Max Marks
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  
  // Session
  doc.text(`Session: ${data.session}`, margin + 3, row1Y);
  
  // Date
  doc.text(`Date: ${data.date}`, margin + 70, row1Y);
  
  // Max Marks
  doc.text(`Max Marks: ${data.maxMarks}`, pageWidth - margin - 3, row1Y, { align: 'right' });

  // Row 2: Class, Section
  const row2Y = row1Y + 10;
  doc.text(`Class: ${data.className}`, margin + 3, row2Y);
  doc.text(`Section: ${data.section || 'N/A'}`, margin + 70, row2Y);

  // Row 3: Subject, Teacher Name
  const row3Y = row2Y + 10;
  doc.text(`Subject: ${data.subject}`, margin + 3, row3Y);
  doc.text(`Teacher: ${data.teacherName || 'N/A'}`, margin + 90, row3Y);

  // Separator line with gold accent
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1);
  doc.line(margin, row3Y + 6, pageWidth - margin, row3Y + 6);

  // Table
  const tableStartY = row3Y + 12;

  autoTable(doc, {
    startY: tableStartY,
    head: [[
      { content: 'Sr.No', styles: { halign: 'center' } },
      { content: 'Student ID', styles: { halign: 'center' } },
      { content: 'Student Name', styles: { halign: 'left' } },
      { content: 'Father Name', styles: { halign: 'left' } },
      { content: 'Theory', styles: { halign: 'center' } },
      { content: 'Practical', styles: { halign: 'center' } },
      { content: 'Total', styles: { halign: 'center' } },
    ]],
    body: data.students.map((student, index) => [
      { content: (index + 1).toString(), styles: { halign: 'center' } },
      { content: student.student_id, styles: { halign: 'center' } },
      { content: student.name, styles: { halign: 'left' } },
      { content: student.father_name, styles: { halign: 'left' } },
      { content: student.theory_marks?.toString() || '-', styles: { halign: 'center' } },
      { content: student.practical_marks?.toString() || '-', styles: { halign: 'center' } },
      { content: student.total_marks?.toString() || '-', styles: { halign: 'center' } },
    ]),
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      lineWidth: 0.3,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 22 },
      2: { cellWidth: 42 },
      3: { cellWidth: 42 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22 },
      6: { cellWidth: 22 },
    },
  });

  // Apply styled footer
  drawStyledFooter(doc, 1, 1, "Madyan Swat, Pakistan");

  return doc;
};

export const downloadAwardList = async (data: AwardListData, filename: string) => {
  const doc = await generateAwardListPdf(data);
  doc.save(`${filename}.pdf`);
};