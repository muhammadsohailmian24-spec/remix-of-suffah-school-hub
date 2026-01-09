import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentInfo {
  sr_no: number;
  student_id: string;
  name: string;
  father_name: string;
  theory_marks?: number | string;
  practical_marks?: number | string;
  total_marks?: number | string;
}

interface AwardListData {
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

  // Load and add header image
  try {
    const headerImg = await loadImage('/images/school-header.png');
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = 25;
    doc.addImage(headerImg, 'PNG', margin, 5, imgWidth, imgHeight);
  } catch (error) {
    // Try to load and add logo if header fails
    try {
      const logoImg = await loadImage('/images/school-logo.png');
      doc.addImage(logoImg, 'PNG', margin, 5, 22, 22);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('The Suffah Public School & College', margin + 27, 15);
      doc.setFontSize(10);
      doc.text('PSRA Reg. No. 200445000302 | BISE Reg. No. 434-B/Swat-C', margin + 27, 22);
      doc.text('Madyan Swat, Pakistan', margin + 27, 28);
    } catch {
      // Fallback text header if both images fail
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('The Suffah Public School & College', pageWidth / 2, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text('PSRA Reg. No. 200445000302 | BISE Reg. No. 434-B/Swat-C', pageWidth / 2, 22, { align: 'center' });
    }
  }

  const startY = 38;

  // Award List title box - centered
  const titleWidth = 55;
  const titleX = pageWidth / 2 - titleWidth / 2;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0);
  doc.rect(titleX, startY - 5, titleWidth, 8, 'FD');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Subject Wise Award-List', pageWidth / 2, startY, { align: 'center' });

  // Row 1: Session, Date, Max Marks
  const row1Y = startY + 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Session: ${data.session}`, margin, row1Y);
  doc.text(`Date: ${data.date}`, pageWidth / 2 - 20, row1Y);
  doc.text(`Max Marks: ${data.maxMarks}`, pageWidth - margin - 40, row1Y);

  // Row 2: Class, Section
  const row2Y = row1Y + 7;
  doc.text(`Class: ${data.className}`, margin, row2Y);
  doc.text(`Section: ${data.section || 'N/A'}`, pageWidth / 2 - 20, row2Y);

  // Row 3: Subject, Teacher Name
  const row3Y = row2Y + 7;
  doc.text(`Subject: ${data.subject}`, margin, row3Y);
  doc.text(`Teacher: ${data.teacherName || 'N/A'}`, pageWidth / 2 - 20, row3Y);

  // Separator line
  doc.setLineWidth(0.3);
  doc.line(margin, row3Y + 4, pageWidth - margin, row3Y + 4);

  // Table
  const tableStartY = row3Y + 8;

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
      { content: student.theory_marks?.toString() || '', styles: { halign: 'center' } },
      { content: student.practical_marks?.toString() || '', styles: { halign: 'center' } },
      { content: student.total_marks?.toString() || '', styles: { halign: 'center' } },
    ]),
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [240, 240, 240],
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
      1: { cellWidth: 22 },
      2: { cellWidth: 42 },
      3: { cellWidth: 42 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22 },
      6: { cellWidth: 22 },
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