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
  const margin = 12;
  const logoImg = await loadLogo();
  
  // Add watermark
  await addWatermark(doc);

  // ===== ELEGANT HEADER WITH GRADIENT EFFECT =====
  // Primary header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 42, "F");
  
  // Gold accent line at bottom of header
  doc.setFillColor(...goldColor);
  doc.rect(0, 42, pageWidth, 2.5, "F");
  
  // Logo with elegant border
  if (logoImg) {
    const logoSize = 28;
    const logoX = margin + 2;
    const logoY = 7;
    
    // Gold ring around logo
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(1.5);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2);
    
    // White background for logo
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 0.5, 'F');
    
    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }

  // School name and details
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text('The Suffah Public School & College', pageWidth / 2 + 8, 15, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('PSRA Reg. No. 200445000302 | BISE Reg. No. 434-B/Swat-C', pageWidth / 2 + 8, 23, { align: 'center' });
  doc.text('Madyan Swat, Pakistan', pageWidth / 2 + 8, 30, { align: 'center' });

  // ===== TITLE BANNER =====
  const titleY = 52;
  const titleWidth = 70;
  const titleX = pageWidth / 2 - titleWidth / 2;
  
  // Title background with gold accent
  doc.setFillColor(...primaryColor);
  doc.roundedRect(titleX, titleY - 7, titleWidth, 12, 3, 3, 'F');
  
  // Gold border on title
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(0.8);
  doc.roundedRect(titleX, titleY - 7, titleWidth, 12, 3, 3, 'S');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Subject Wise Award List', pageWidth / 2, titleY, { align: 'center' });

  // ===== INFO SECTION WITH ELEGANT BOXES =====
  const infoStartY = titleY + 14;
  
  // Info container box
  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(220, 220, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, infoStartY - 4, pageWidth - margin * 2, 32, 2, 2, 'FD');
  
  // Row 1: Session, Date, Max Marks
  const row1Y = infoStartY + 4;
  doc.setFontSize(9);
  doc.setTextColor(...darkColor);
  
  // Labels in bold
  doc.setFont('helvetica', 'bold');
  doc.text('Session:', margin + 5, row1Y);
  doc.text('Date:', margin + 65, row1Y);
  doc.text('Max Marks:', pageWidth - margin - 45, row1Y);
  
  // Values in normal
  doc.setFont('helvetica', 'normal');
  doc.text(data.isBlank ? '________________' : data.session, margin + 24, row1Y);
  doc.text(data.isBlank ? '________________' : data.date, margin + 78, row1Y);
  doc.text(data.isBlank ? '______' : data.maxMarks, pageWidth - margin - 20, row1Y);

  // Row 2: Class, Section
  const row2Y = row1Y + 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Class:', margin + 5, row2Y);
  doc.text('Section:', margin + 65, row2Y);
  
  doc.setFont('helvetica', 'normal');
  doc.text(data.isBlank ? '________________' : data.className, margin + 20, row2Y);
  doc.text(data.isBlank ? '________________' : (data.section || 'N/A'), margin + 83, row2Y);

  // Row 3: Subject, Teacher Name
  const row3Y = row2Y + 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Subject:', margin + 5, row3Y);
  doc.text('Teacher:', margin + 85, row3Y);
  
  doc.setFont('helvetica', 'normal');
  doc.text(data.isBlank ? '_____________________________' : data.subject, margin + 24, row3Y);
  doc.text(data.isBlank ? '_____________________________' : (data.teacherName || 'N/A'), margin + 104, row3Y);

  // ===== TABLE =====
  const tableStartY = infoStartY + 38;

  // Prepare table body
  let tableBody: any[][];
  
  if (data.isBlank) {
    // Generate 25 blank rows for blank award list
    tableBody = Array.from({ length: 25 }, (_, index) => [
      { content: (index + 1).toString(), styles: { halign: 'center' } },
      { content: '', styles: { halign: 'center' } },
      { content: '', styles: { halign: 'left' } },
      { content: '', styles: { halign: 'left' } },
      { content: '', styles: { halign: 'center' } },
      { content: '', styles: { halign: 'center' } },
      { content: '', styles: { halign: 'center' } },
    ]);
  } else {
    tableBody = data.students.map((student, index) => [
      { content: (index + 1).toString(), styles: { halign: 'center' } },
      { content: student.student_id, styles: { halign: 'center' } },
      { content: student.name, styles: { halign: 'left' } },
      { content: student.father_name, styles: { halign: 'left' } },
      { content: student.theory_marks?.toString() || '-', styles: { halign: 'center' } },
      { content: student.practical_marks?.toString() || '-', styles: { halign: 'center' } },
      { content: student.total_marks?.toString() || '-', styles: { halign: 'center' } },
    ]);
  }

  autoTable(doc, {
    startY: tableStartY,
    head: [[
      { content: 'Sr.', styles: { halign: 'center' } },
      { content: 'Roll No.', styles: { halign: 'center' } },
      { content: 'Student Name', styles: { halign: 'left' } },
      { content: 'Father Name', styles: { halign: 'left' } },
      { content: 'Theory', styles: { halign: 'center' } },
      { content: 'Practical', styles: { halign: 'center' } },
      { content: 'Total', styles: { halign: 'center' } },
    ]],
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
      lineColor: [180, 180, 185],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      lineWidth: 0.3,
      lineColor: primaryColor,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: darkColor,
    },
    alternateRowStyles: {
      fillColor: [248, 249, 252],
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 20 },
      2: { cellWidth: 45 },
      3: { cellWidth: 45 },
      4: { cellWidth: 20 },
      5: { cellWidth: 22 },
      6: { cellWidth: 20 },
    },
    didDrawPage: () => {
      // Add footer on each page
      drawStyledFooter(doc, 1, 1, "Madyan Swat, Pakistan");
    },
  });

  // ===== SIGNATURE SECTION =====
  const finalY = (doc as any).lastAutoTable?.finalY || tableStartY + 100;
  
  if (finalY < pageHeight - 45) {
    const sigY = finalY + 18;
    
    doc.setDrawColor(...grayColor);
    doc.setLineWidth(0.3);
    
    // Left signature line
    doc.line(margin + 10, sigY, margin + 60, sigY);
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text('Teacher Signature', margin + 35, sigY + 5, { align: 'center' });
    
    // Right signature line  
    doc.line(pageWidth - margin - 60, sigY, pageWidth - margin - 10, sigY);
    doc.text('Principal Signature', pageWidth - margin - 35, sigY + 5, { align: 'center' });
  }

  return doc;
};

export const downloadAwardList = async (data: AwardListData, filename: string) => {
  const doc = await generateAwardListPdf(data);
  doc.save(`${filename}.pdf`);
};

export const downloadBlankAwardList = async () => {
  const blankData: AwardListData = {
    session: '',
    date: '',
    className: '',
    section: '',
    subject: '',
    teacherName: '',
    maxMarks: '',
    students: [],
    isBlank: true,
  };
  
  const doc = await generateAwardListPdf(blankData);
  doc.save('Blank_Award_List.pdf');
};
