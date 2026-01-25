import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadLogo, addWatermark, primaryColor, goldColor, grayColor } from './pdfDesignUtils';

interface ContactStudent {
  rollNumber: string;
  studentId: string;
  name: string;
  fatherName: string;
  address: string;
  fatherCnic: string;
  phone: string;
}

export interface ContactListData {
  session: string;
  className: string;
  section: string;
  date: string;
  students: ContactStudent[];
}

export const generateContactListPdf = async (data: ContactListData): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const logoImg = await loadLogo();
  
  // Add watermark
  await addWatermark(doc, 0.05);

  // ===== HEADER SECTION =====
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Gold accent line
  doc.setFillColor(...goldColor);
  doc.rect(0, 35, pageWidth, 2, 'F');

  // Logo with white circular background
  if (logoImg) {
    const logoSize = 22;
    const logoX = margin + 2;
    const logoY = 6;
    
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2, 'F');
    
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(1.2);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2);
    
    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }

  // School name and details
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('The Suffah Public School & College', pageWidth / 2, 12, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Madyan Swat, Pakistan', pageWidth / 2, 19, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Contact List', pageWidth / 2, 30, { align: 'center' });

  // ===== INFO SECTION =====
  const infoY = 42;
  const colWidth = (pageWidth - margin * 2) / 4;
  
  const drawInfoBox = (x: number, y: number, width: number, label: string, value: string) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, width, 12, 2, 2, 'FD');
    
    doc.setFontSize(7);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(label, x + 3, y + 4);
    
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '-', x + 3, y + 10);
  };
  
  // Info row
  drawInfoBox(margin, infoY, colWidth - 2, 'SESSION', data.session);
  const classDisplay = data.className + (data.section ? ` - ${data.section}` : '');
  drawInfoBox(margin + colWidth, infoY, colWidth - 2, 'CLASS', classDisplay);
  drawInfoBox(margin + colWidth * 2, infoY, colWidth - 2, 'TOTAL STUDENTS', data.students.length.toString());
  drawInfoBox(margin + colWidth * 3, infoY, colWidth - 2, 'DATE', data.date);

  // ===== TABLE SECTION =====
  const tableStartY = infoY + 16;

  const tableBody = data.students.map((student, index) => [
    { content: (index + 1).toString(), styles: { halign: 'center' as const, fontStyle: 'bold' as const } },
    { content: student.rollNumber || student.studentId, styles: { halign: 'center' as const } },
    { content: student.name, styles: { halign: 'left' as const } },
    { content: student.fatherName, styles: { halign: 'left' as const } },
    { content: student.address || '-', styles: { halign: 'left' as const, fontSize: 8 } },
    { content: student.fatherCnic || '-', styles: { halign: 'center' as const } },
    { content: student.phone || '-', styles: { halign: 'center' as const } },
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [[
      { content: 'S.No', styles: { halign: 'center', fillColor: primaryColor as [number, number, number] } },
      { content: 'Roll No', styles: { halign: 'center', fillColor: primaryColor as [number, number, number] } },
      { content: 'Student Name', styles: { halign: 'left', fillColor: primaryColor as [number, number, number] } },
      { content: 'Father Name', styles: { halign: 'left', fillColor: primaryColor as [number, number, number] } },
      { content: 'Address', styles: { halign: 'left', fillColor: primaryColor as [number, number, number] } },
      { content: 'Father CNIC', styles: { halign: 'center', fillColor: primaryColor as [number, number, number] } },
      { content: 'Phone', styles: { halign: 'center', fillColor: primaryColor as [number, number, number] } },
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
      1: { cellWidth: 20 },
      2: { cellWidth: 50 },
      3: { cellWidth: 50 },
      4: { cellWidth: 70 },
      5: { cellWidth: 35 },
      6: { cellWidth: 35 },
    },
    didDrawPage: (hookData) => {
      // Footer on each page
      const currentPage = hookData.pageNumber;
      const totalPages = doc.getNumberOfPages();
      
      doc.setDrawColor(...grayColor);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      
      doc.setFontSize(8);
      doc.setTextColor(...grayColor);
      doc.text('The Suffah Public School & College, Madyan Swat', margin, pageHeight - 7);
      doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
    }
  });

  return doc;
};

export const downloadContactListPdf = async (data: ContactListData, filename: string) => {
  const doc = await generateContactListPdf(data);
  doc.save(`${filename}.pdf`);
};
