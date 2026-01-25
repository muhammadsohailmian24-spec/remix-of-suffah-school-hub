import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadLogo, addWatermark, primaryColor, goldColor, grayColor } from './pdfDesignUtils';

interface PositionStudent {
  position: number;
  rollNumber: string;
  studentId: string;
  name: string;
  totalMarks: number;
  totalMax: number;
  percentage: string;
}

export interface PositionListData {
  session: string;
  className: string;
  section: string;
  examType: string;
  date: string;
  students: PositionStudent[];
}

export const generatePositionListPdf = async (data: PositionListData): Promise<jsPDF> => {
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
    
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2, 'F');
    
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
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Position List', pageWidth / 2 + 10, 38, { align: 'center' });

  // ===== INFO SECTION =====
  const infoY = 52;
  const colWidth = (pageWidth - margin * 2) / 4;
  
  const drawInfoBox = (x: number, y: number, width: number, label: string, value: string) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, width, 14, 2, 2, 'FD');
    
    doc.setFontSize(7);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(label, x + 3, y + 4);
    
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '-', x + 3, y + 11);
  };
  
  // Row 1: Session, Class, Exam Type, Date
  drawInfoBox(margin, infoY, colWidth - 2, 'SESSION', data.session);
  const classDisplay = data.className + (data.section ? ` - ${data.section}` : '');
  drawInfoBox(margin + colWidth, infoY, colWidth - 2, 'CLASS', classDisplay);
  drawInfoBox(margin + colWidth * 2, infoY, colWidth - 2, 'EXAM TYPE', data.examType);
  drawInfoBox(margin + colWidth * 3, infoY, colWidth - 2, 'DATE', data.date);

  // ===== TABLE SECTION =====
  const tableStartY = infoY + 20;

  // Prepare table body with medal indicators for top 3
  const tableBody = data.students.map((student) => {
    let positionDisplay = student.position.toString();
    
    return [
      { content: positionDisplay, styles: { 
        halign: 'center' as const, 
        fontStyle: 'bold' as const,
        fillColor: student.position === 1 ? [255, 215, 0] as [number, number, number] : 
                   student.position === 2 ? [192, 192, 192] as [number, number, number] : 
                   student.position === 3 ? [205, 127, 50] as [number, number, number] : 
                   undefined
      }},
      { content: student.rollNumber || student.studentId, styles: { halign: 'center' as const } },
      { content: student.name, styles: { halign: 'left' as const, fontStyle: student.position <= 3 ? 'bold' as const : 'normal' as const } },
      { content: `${student.totalMarks}/${student.totalMax}`, styles: { halign: 'center' as const } },
      { content: `${student.percentage}%`, styles: { 
        halign: 'center' as const, 
        fontStyle: 'bold' as const,
        textColor: parseFloat(student.percentage) >= 80 ? [0, 128, 0] as [number, number, number] : 
                   parseFloat(student.percentage) >= 60 ? [30, 30, 30] as [number, number, number] : 
                   parseFloat(student.percentage) >= 40 ? [200, 150, 0] as [number, number, number] : 
                   [200, 0, 0] as [number, number, number]
      }},
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [[
      { content: 'Position', styles: { halign: 'center', fillColor: primaryColor as [number, number, number] } },
      { content: 'Roll No', styles: { halign: 'center', fillColor: primaryColor as [number, number, number] } },
      { content: 'Student Name', styles: { halign: 'left', fillColor: primaryColor as [number, number, number] } },
      { content: 'Marks', styles: { halign: 'center', fillColor: primaryColor as [number, number, number] } },
      { content: 'Percentage', styles: { halign: 'center', fillColor: primaryColor as [number, number, number] } },
    ]],
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 10,
      cellPadding: 4,
      lineColor: [200, 200, 200],
      lineWidth: 0.2,
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: primaryColor as [number, number, number],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: 5,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 25 },
      2: { cellWidth: 80 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
    },
  });

  // ===== SUMMARY SECTION =====
  const finalY = (doc as any).lastAutoTable?.finalY || tableStartY + 100;
  
  if (data.students.length > 0 && finalY < pageHeight - 45) {
    const summaryY = finalY + 10;
    
    // Summary box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, summaryY, pageWidth - margin * 2, 22, 3, 3, 'FD');
    
    // Summary title
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('SUMMARY', margin + 5, summaryY + 6);
    
    // Stats
    const avgPercentage = data.students.length > 0 
      ? (data.students.reduce((sum, s) => sum + parseFloat(s.percentage), 0) / data.students.length).toFixed(1) 
      : '0';
    const passed = data.students.filter(s => parseFloat(s.percentage) >= 40).length;
    const failed = data.students.length - passed;
    const passRate = data.students.length > 0 ? ((passed / data.students.length) * 100).toFixed(0) : '0';
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    const statsY = summaryY + 15;
    doc.text(`Total Students: ${data.students.length}`, margin + 5, statsY);
    doc.text(`Class Average: ${avgPercentage}%`, margin + 50, statsY);
    doc.text(`Passed: ${passed}`, margin + 100, statsY);
    doc.text(`Failed: ${failed}`, margin + 130, statsY);
    doc.text(`Pass Rate: ${passRate}%`, margin + 160, statsY);
  }

  // ===== FOOTER =====
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text('The Suffah Public School & College, Madyan Swat', margin, pageHeight - 10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });

  return doc;
};

export const downloadPositionListPdf = async (data: PositionListData, filename: string) => {
  const doc = await generatePositionListPdf(data);
  doc.save(`${filename}.pdf`);
};
