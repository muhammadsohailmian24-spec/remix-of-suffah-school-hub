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
  const margin = 10;
  const logoImg = await loadLogo();
  
  // Add watermark
  await addWatermark(doc);

  // ===== HEADER MATCHING SCREENSHOT DESIGN =====
  // Draw header border box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, 8, pageWidth - margin * 2, 30);

  // Logo on left side with border
  if (logoImg) {
    const logoSize = 24;
    const logoX = margin + 3;
    const logoY = 11;
    
    // Draw border around logo
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(logoX - 1, logoY - 1, logoSize + 2, logoSize + 2);
    
    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }

  // School name - large stylized text
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('The Suffah', pageWidth / 2 + 5, 18, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Public School & College Madyan', pageWidth / 2 + 5, 25, { align: 'center' });
  
  doc.setFontSize(8);
  doc.text('PSRA Reg. No. 200445000302', pageWidth / 2 - 15, 32, { align: 'center' });
  doc.text('BISE Reg. No. 434-B/Swat-C', pageWidth / 2 + 25, 32, { align: 'center' });

  // ===== INFO ROW WITH TITLE BOX =====
  const infoY = 44;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  
  // Session
  doc.text('Session:', margin, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.session || '________', margin + 18, infoY);
  
  // Date
  doc.setFont('helvetica', 'bold');
  doc.text(data.date || '________________', margin + 50, infoY);
  
  // Title box in center
  const titleBoxWidth = 50;
  const titleBoxX = pageWidth / 2 - titleBoxWidth / 2;
  doc.setFillColor(220, 220, 220);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(titleBoxX, infoY - 5, titleBoxWidth, 8, 'FD');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Subject Wise Award-List', pageWidth / 2, infoY, { align: 'center' });
  
  // Class
  doc.setFontSize(9);
  doc.text('Class:', pageWidth - margin - 55, infoY);
  doc.setFont('helvetica', 'normal');
  const classDisplay = data.className ? `${data.className}${data.section ? ' ' + data.section : ''}` : '________________';
  doc.text(classDisplay, pageWidth - margin - 42, infoY);
  
  // Marks
  doc.setFont('helvetica', 'bold');
  doc.text('Marks:', pageWidth - margin - 20, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.maxMarks || '______', pageWidth - margin - 7, infoY);

  // Second info row
  const info2Y = infoY + 10;
  
  // Subject with underline
  doc.setFont('helvetica', 'bold');
  doc.text('Subject:', margin, info2Y);
  doc.setFont('helvetica', 'normal');
  if (data.isBlank && !data.subject) {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(margin + 18, info2Y + 1, margin + 55, info2Y + 1);
  } else {
    doc.text(data.subject || '', margin + 18, info2Y);
  }
  
  // Teacher Name with underline
  doc.setFont('helvetica', 'bold');
  doc.text('Teacher Name:', margin + 60, info2Y);
  doc.setFont('helvetica', 'normal');
  if (data.isBlank && !data.teacherName) {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(margin + 90, info2Y + 1, margin + 130, info2Y + 1);
  } else {
    doc.text(data.teacherName || '', margin + 90, info2Y);
  }
  
  // Section
  doc.setFont('helvetica', 'bold');
  doc.text('Section:', pageWidth - margin - 40, info2Y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.section || '________', pageWidth - margin - 22, info2Y);

  // ===== TABLE =====
  const tableStartY = info2Y + 8;

  // Prepare table body
  const tableBody = data.students.map((student, index) => [
    { content: (index + 1).toString(), styles: { halign: 'center' as const } },
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
      { content: 'Sr.no', styles: { halign: 'center' } },
      { content: 'Student-ID', styles: { halign: 'center' } },
      { content: 'Name', styles: { halign: 'left' } },
      { content: 'Father-Name', styles: { halign: 'left' } },
      { content: 'Theory', styles: { halign: 'center' } },
      { content: 'Practical', styles: { halign: 'center' } },
      { content: 'Total Marks', styles: { halign: 'center' } },
    ]],
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineWidth: 0.3,
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 22 },
      2: { cellWidth: 45 },
      3: { cellWidth: 45 },
      4: { cellWidth: 18 },
      5: { cellWidth: 20 },
      6: { cellWidth: 22 },
    },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.2,
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(...grayColor);
  doc.text('Madyan Swat, Pakistan', pageWidth / 2, pageHeight - 8, { align: 'center' });

  return doc;
};

export const downloadAwardList = async (data: AwardListData, filename: string) => {
  const doc = await generateAwardListPdf(data);
  doc.save(`${filename}.pdf`);
};
