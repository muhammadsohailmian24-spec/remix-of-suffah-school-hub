import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadLogo, addWatermark, primaryColor, goldColor, grayColor } from './pdfDesignUtils';

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
  isBlank?: boolean;
}

export const generateAwardListPdf = async (data: AwardListData): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const logoImg = await loadLogo();
  
  // Add watermark
  await addWatermark(doc, 0.05);

  // ===== HEADER SECTION =====
  // Header background with gradient effect
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 42, 'F');
  
  // Gold accent line
  doc.setFillColor(...goldColor);
  doc.rect(0, 42, pageWidth, 2, 'F');

  // Logo with white circular background
  if (logoImg) {
    const logoSize = 28;
    const logoX = margin + 2;
    const logoY = 7;
    
    // White circle background for logo
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2, 'F');
    
    // Gold ring around logo
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(1.5);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2);
    
    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }

  // School name and details
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('The Suffah Public School & College', pageWidth / 2 + 10, 14, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Madyan Swat, Pakistan', pageWidth / 2 + 10, 22, { align: 'center' });
  
  doc.setFontSize(8);
  doc.text('PSRA Reg. No. 200445000302  |  BISE Reg. No. 434-B/Swat-C', pageWidth / 2 + 10, 29, { align: 'center' });
  
  // Document title
  doc.setFillColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Subject Wise Award List', pageWidth / 2 + 10, 38, { align: 'center' });

  // ===== INFO SECTION =====
  const infoY = 52;
  const colWidth = (pageWidth - margin * 2) / 3;
  
  // Draw info boxes
  const drawInfoBox = (x: number, y: number, width: number, label: string, value: string, isBlankField: boolean = false) => {
    // Box background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, width, 14, 2, 2, 'FD');
    
    // Label
    doc.setFontSize(7);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(label, x + 3, y + 4);
    
    // Value or underline for blank
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    if (isBlankField && !value) {
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.2);
      doc.line(x + 3, y + 11, x + width - 3, y + 11);
    } else {
      doc.text(value || '-', x + 3, y + 11);
    }
  };
  
  // Row 1: Session, Date, Class
  drawInfoBox(margin, infoY, colWidth - 4, 'SESSION', data.session, data.isBlank);
  drawInfoBox(margin + colWidth, infoY, colWidth - 4, 'DATE', data.date || new Date().toLocaleDateString(), false);
  const classDisplay = data.className ? `${data.className}${data.section ? ' - ' + data.section : ''}` : '';
  drawInfoBox(margin + colWidth * 2, infoY, colWidth - 4, 'CLASS', classDisplay, data.isBlank);
  
  // Row 2: Subject, Teacher, Max Marks
  const infoY2 = infoY + 18;
  drawInfoBox(margin, infoY2, colWidth - 4, 'SUBJECT', data.subject, data.isBlank);
  drawInfoBox(margin + colWidth, infoY2, colWidth - 4, 'TEACHER NAME', data.teacherName, data.isBlank);
  drawInfoBox(margin + colWidth * 2, infoY2, colWidth - 4, 'MAX MARKS', data.maxMarks, data.isBlank);

  // ===== TABLE SECTION =====
  const tableStartY = infoY2 + 22;

  // Prepare table body
  const tableBody = data.students.map((student, index) => [
    { content: (index + 1).toString(), styles: { halign: 'center' as const, fontStyle: 'bold' as const } },
    { content: student.student_id, styles: { halign: 'center' as const } },
    { content: student.name, styles: { halign: 'left' as const } },
    { content: student.father_name, styles: { halign: 'left' as const } },
    { content: data.isBlank ? '' : (student.theory_marks?.toString() || ''), styles: { halign: 'center' as const } },
    { content: data.isBlank ? '' : (student.practical_marks?.toString() || ''), styles: { halign: 'center' as const } },
    { content: data.isBlank ? '' : (student.total_marks?.toString() || ''), styles: { halign: 'center' as const } },
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [[
      { content: 'S.No', styles: { halign: 'center', fillColor: primaryColor as [number, number, number] } },
      { content: 'Roll No', styles: { halign: 'center', fillColor: primaryColor as [number, number, number] } },
      { content: 'Student Name', styles: { halign: 'left', fillColor: primaryColor as [number, number, number] } },
      { content: 'Father Name', styles: { halign: 'left', fillColor: primaryColor as [number, number, number] } },
      { content: 'Theory', styles: { halign: 'center', fillColor: primaryColor as [number, number, number] } },
      { content: 'Practical', styles: { halign: 'center', fillColor: primaryColor as [number, number, number] } },
      { content: 'Total', styles: { halign: 'center', fillColor: primaryColor as [number, number, number] } },
    ]],
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.2,
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: primaryColor as [number, number, number],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 18 },
      2: { cellWidth: 48 },
      3: { cellWidth: 48 },
      4: { cellWidth: 20 },
      5: { cellWidth: 22 },
      6: { cellWidth: 18 },
    },
  });

  // ===== FOOTER =====
  // Footer line
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  
  // Footer text
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text('The Suffah Public School & College, Madyan Swat', margin, pageHeight - 10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });

  return doc;
};

export const downloadAwardList = async (data: AwardListData, filename: string) => {
  const doc = await generateAwardListPdf(data);
  doc.save(`${filename}.pdf`);
};
