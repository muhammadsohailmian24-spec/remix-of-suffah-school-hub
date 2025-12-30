import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface StudentInfo {
  sr_no: number;
  student_id: string;
  name: string;
  father_name: string;
}

interface AwardListData {
  session: string;
  date: string;
  className: string;
  section: string;
  subject: string;
  teacherName: string;
  marks: string;
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

  // Load and add header image
  try {
    const headerImg = await loadImage('/images/school-header.png');
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = 25;
    doc.addImage(headerImg, 'PNG', margin, 5, imgWidth, imgHeight);
  } catch (error) {
    // Fallback text header if image fails
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('The Suffah Public School & College', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text('PSRA Reg. No. 200445000302 | BISE Reg. No. 434-B/Swat-C', pageWidth / 2, 22, { align: 'center' });
  }

  const startY = 35;

  // Session and Date row
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Session: ${data.session}`, margin, startY);
  doc.text(data.date, margin + 50, startY);

  // Award List title box
  const titleWidth = 50;
  const titleX = pageWidth / 2 - titleWidth / 2;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0);
  doc.rect(titleX, startY - 5, titleWidth, 8, 'FD');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Subject Wise Award-List', pageWidth / 2, startY, { align: 'center' });

  // Class and Marks
  doc.text(`Class: ${data.className}`, pageWidth - margin - 50, startY);
  doc.text(`Marks:`, pageWidth - margin - 15, startY);
  doc.line(pageWidth - margin - 10, startY, pageWidth - margin, startY);

  // Subject and Section row
  const row2Y = startY + 8;
  doc.text('Subject:', margin, row2Y);
  doc.line(margin + 18, row2Y, margin + 45, row2Y);
  
  doc.text('Teacher Name:', pageWidth / 2 - 30, row2Y);
  doc.line(pageWidth / 2 - 2, row2Y, pageWidth / 2 + 35, row2Y);
  
  doc.text(`Section: ${data.section}`, pageWidth - margin - 35, row2Y);

  // Table
  const tableStartY = row2Y + 8;

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
    body: data.students.map((student, index) => [
      { content: (index + 1).toString(), styles: { halign: 'center' } },
      { content: student.student_id, styles: { halign: 'center' } },
      { content: student.name, styles: { halign: 'left' } },
      { content: student.father_name, styles: { halign: 'left' } },
      { content: '', styles: { halign: 'center' } },
      { content: '', styles: { halign: 'center' } },
      { content: '', styles: { halign: 'center' } },
    ]),
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineWidth: 0.3,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 25 },
      2: { cellWidth: 45 },
      3: { cellWidth: 45 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 23 },
    },
  });

  return doc;
};

const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};

export const downloadAwardList = async (data: AwardListData, filename: string) => {
  const doc = await generateAwardListPdf(data);
  doc.save(`${filename}.pdf`);
};
