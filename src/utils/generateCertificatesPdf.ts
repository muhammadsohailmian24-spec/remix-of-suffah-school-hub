import jsPDF from "jspdf";
import { loadLogo, addWatermark, drawStyledFooter, primaryColor, goldColor, darkColor, grayColor } from "./pdfDesignUtils";

export interface CertificateBaseData {
  studentName: string;
  fatherName?: string;
  className: string;
  section?: string;
  studentId: string;
  schoolName?: string;
  schoolAddress?: string;
  dateOfBirth?: string;
}

export interface ParticipationCertData extends CertificateBaseData {
  eventName: string;
  eventDate: string;
  position?: string;
}

export interface AppreciationCertData extends CertificateBaseData {
  appreciationType: string;
  remarks?: string;
}

export interface DOBCertData extends CertificateBaseData {
  dobInWords?: string;
}

export interface HonorCertData extends CertificateBaseData {
  achievement: string;
  examName?: string;
  percentage?: string;
}

export interface SportsCertData extends CertificateBaseData {
  sportName: string;
  eventName: string;
  position: string;
  eventDate: string;
}

export interface ExperienceCertData {
  employeeName: string;
  designation: string;
  department?: string;
  joiningDate: string;
  leavingDate?: string;
  remarks?: string;
  schoolName?: string;
  schoolAddress?: string;
}

export interface MonthlyProgressData extends CertificateBaseData {
  month: string;
  year: string;
  attendance?: { present: number; absent: number; total: number };
  grades?: { subject: string; grade: string }[];
  teacherRemarks?: string;
}

export interface AnnualProgressData extends CertificateBaseData {
  session: string;
  attendance?: { present: number; absent: number; total: number };
  grades?: { subject: string; grade: string; marks: number }[];
  overallGrade?: string;
  rank?: string;
  teacherRemarks?: string;
  principalRemarks?: string;
}

export interface SLCData extends CertificateBaseData {
  admissionDate: string;
  leavingDate: string;
  lastClassAttended: string;
  lastExamPassed?: string;
  reasonForLeaving: string;
  conduct?: string;
  certificateNumber: string;
  characterRemarks?: string;
}

const SCHOOL_NAME = "The Suffah Public School & College";
const SCHOOL_ADDRESS = "Madyan Swat, Pakistan";

const drawCertificateBorder = (doc: jsPDF) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Outer gold border
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(3);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  
  // Inner primary border
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);
  
  // Decorative corners
  const cornerSize = 15;
  doc.setFillColor(...goldColor);
  
  // Top left corner
  doc.triangle(15, 15, 15 + cornerSize, 15, 15, 15 + cornerSize, 'F');
  // Top right corner
  doc.triangle(pageWidth - 15, 15, pageWidth - 15 - cornerSize, 15, pageWidth - 15, 15 + cornerSize, 'F');
  // Bottom left corner
  doc.triangle(15, pageHeight - 15, 15 + cornerSize, pageHeight - 15, 15, pageHeight - 15 - cornerSize, 'F');
  // Bottom right corner
  doc.triangle(pageWidth - 15, pageHeight - 15, pageWidth - 15 - cornerSize, pageHeight - 15, pageWidth - 15, pageHeight - 15 - cornerSize, 'F');
};

const drawCertificateHeader = async (doc: jsPDF, title: string, schoolName?: string, schoolAddress?: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoImg = await loadLogo();
  
  // Logo with gold ring
  if (logoImg) {
    const logoSize = 35;
    const logoX = pageWidth / 2 - logoSize / 2;
    const logoY = 25;
    
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(2);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 3);
    
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 1, 'F');
    
    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }
  
  // School name
  doc.setTextColor(...primaryColor);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName || SCHOOL_NAME, pageWidth / 2, 72, { align: "center" });
  
  // School address
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text(schoolAddress || SCHOOL_ADDRESS, pageWidth / 2, 80, { align: "center" });
  
  // Certificate title with underline
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...goldColor);
  doc.text(title, pageWidth / 2, 95, { align: "center" });
  
  // Decorative line under title
  const titleWidth = doc.getTextWidth(title);
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1);
  doc.line(pageWidth / 2 - titleWidth / 2 - 10, 98, pageWidth / 2 + titleWidth / 2 + 10, 98);
  
  return 110;
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatDateToWords = (dateStr?: string): string => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty', 'Twenty-One', 'Twenty-Two', 'Twenty-Three', 'Twenty-Four', 'Twenty-Five', 'Twenty-Six', 'Twenty-Seven', 'Twenty-Eight', 'Twenty-Nine', 'Thirty', 'Thirty-One'];
    
    return `${ones[day]} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

// 1. Certificate of Participation
export const generateParticipationCertificate = async (data: ParticipationCertData) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  await addWatermark(doc, 0.04);
  drawCertificateBorder(doc);
  const yStart = await drawCertificateHeader(doc, "CERTIFICATE OF PARTICIPATION", data.schoolName, data.schoolAddress);
  
  let y = yStart + 5;
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text("This is to certify that", pageWidth / 2, y, { align: "center" });
  
  y += 15;
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(data.studentName, pageWidth / 2, y, { align: "center" });
  
  y += 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text(`S/o ${data.fatherName || "_______________"}`, pageWidth / 2, y, { align: "center" });
  
  y += 10;
  doc.setTextColor(...darkColor);
  doc.text(`Class: ${data.className} ${data.section || ""}`, pageWidth / 2, y, { align: "center" });
  
  y += 12;
  doc.setFontSize(14);
  doc.text("has actively participated in", pageWidth / 2, y, { align: "center" });
  
  y += 12;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...goldColor);
  doc.text(`"${data.eventName}"`, pageWidth / 2, y, { align: "center" });
  
  if (data.position) {
    y += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkColor);
    doc.text(`and secured ${data.position} position`, pageWidth / 2, y, { align: "center" });
  }
  
  y += 10;
  doc.setFontSize(12);
  doc.setTextColor(...grayColor);
  doc.text(`held on ${formatDate(data.eventDate)}`, pageWidth / 2, y, { align: "center" });
  
  y += 15;
  doc.setFontSize(14);
  doc.setTextColor(...darkColor);
  doc.text("We wish them all the best for their future endeavors.", pageWidth / 2, y, { align: "center" });
  
  // Signatures
  const sigY = doc.internal.pageSize.getHeight() - 40;
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  
  doc.line(40, sigY, 100, sigY);
  doc.line(pageWidth - 100, sigY, pageWidth - 40, sigY);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Class Teacher", 70, sigY + 6, { align: "center" });
  doc.text("Principal", pageWidth - 70, sigY + 6, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text(`Date: ${formatDate()}`, pageWidth / 2, sigY + 6, { align: "center" });
  
  return doc;
};

// 2. Appreciation & Character Certificate
export const generateAppreciationCertificate = async (data: AppreciationCertData) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  await addWatermark(doc, 0.04);
  drawCertificateBorder(doc);
  const yStart = await drawCertificateHeader(doc, "CERTIFICATE OF APPRECIATION", data.schoolName, data.schoolAddress);
  
  let y = yStart + 5;
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text("This certificate is awarded to", pageWidth / 2, y, { align: "center" });
  
  y += 15;
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(data.studentName, pageWidth / 2, y, { align: "center" });
  
  y += 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text(`S/o ${data.fatherName || "_______________"} | Class: ${data.className} ${data.section || ""}`, pageWidth / 2, y, { align: "center" });
  
  y += 15;
  doc.setFontSize(14);
  doc.setTextColor(...darkColor);
  doc.text("in recognition of their", pageWidth / 2, y, { align: "center" });
  
  y += 12;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...goldColor);
  doc.text(`"${data.appreciationType}"`, pageWidth / 2, y, { align: "center" });
  
  if (data.remarks) {
    y += 12;
    doc.setFontSize(12);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...grayColor);
    const lines = doc.splitTextToSize(data.remarks, pageWidth - 80);
    doc.text(lines, pageWidth / 2, y, { align: "center" });
  }
  
  y += 15;
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text("Keep up the excellent work!", pageWidth / 2, y, { align: "center" });
  
  // Signatures
  const sigY = doc.internal.pageSize.getHeight() - 40;
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  
  doc.line(40, sigY, 100, sigY);
  doc.line(pageWidth - 100, sigY, pageWidth - 40, sigY);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text("Class Teacher", 70, sigY + 6, { align: "center" });
  doc.text("Principal", pageWidth - 70, sigY + 6, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text(`Date: ${formatDate()}`, pageWidth / 2, sigY + 6, { align: "center" });
  
  return doc;
};

// 3. Date of Birth Certificate
export const generateDOBCertificate = async (data: DOBCertData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  await addWatermark(doc, 0.04);
  drawCertificateBorder(doc);
  const yStart = await drawCertificateHeader(doc, "DATE OF BIRTH CERTIFICATE", data.schoolName, data.schoolAddress);
  
  let y = yStart + 10;
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text("This is to certify that according to the school records,", pageWidth / 2, y, { align: "center" });
  
  y += 20;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(data.studentName, pageWidth / 2, y, { align: "center" });
  
  y += 12;
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text(`S/o ${data.fatherName || "_______________"}`, pageWidth / 2, y, { align: "center" });
  
  y += 8;
  doc.text(`Student ID: ${data.studentId}`, pageWidth / 2, y, { align: "center" });
  
  y += 8;
  doc.text(`Class: ${data.className} ${data.section || ""}`, pageWidth / 2, y, { align: "center" });
  
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text("was born on", pageWidth / 2, y, { align: "center" });
  
  y += 15;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...goldColor);
  doc.text(formatDate(data.dateOfBirth), pageWidth / 2, y, { align: "center" });
  
  y += 12;
  doc.setFontSize(14);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...primaryColor);
  doc.text(`(${formatDateToWords(data.dateOfBirth)})`, pageWidth / 2, y, { align: "center" });
  
  y += 20;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("This certificate is issued on the request of the student/guardian", pageWidth / 2, y, { align: "center" });
  doc.text("for official purposes.", pageWidth / 2, y + 6, { align: "center" });
  
  // Signatures and seal
  const sigY = doc.internal.pageSize.getHeight() - 55;
  
  // Official seal
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1.5);
  doc.circle(pageWidth / 2, sigY - 5, 15);
  doc.setFontSize(6);
  doc.setTextColor(...primaryColor);
  doc.text("OFFICIAL", pageWidth / 2, sigY - 7, { align: "center" });
  doc.text("SEAL", pageWidth / 2, sigY - 3, { align: "center" });
  
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  doc.line(pageWidth - 70, sigY + 15, pageWidth - 20, sigY + 15);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text("Principal", pageWidth - 45, sigY + 21, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text(`Issue Date: ${formatDate()}`, 25, sigY + 21);
  
  drawStyledFooter(doc, 1, 1, data.schoolAddress || SCHOOL_ADDRESS);
  
  return doc;
};

// 4. Honor Certificate
export const generateHonorCertificate = async (data: HonorCertData) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  await addWatermark(doc, 0.04);
  drawCertificateBorder(doc);
  const yStart = await drawCertificateHeader(doc, "CERTIFICATE OF HONOR", data.schoolName, data.schoolAddress);
  
  let y = yStart + 5;
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text("This certificate is proudly presented to", pageWidth / 2, y, { align: "center" });
  
  y += 15;
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(data.studentName, pageWidth / 2, y, { align: "center" });
  
  y += 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text(`S/o ${data.fatherName || "_______________"} | Class: ${data.className} ${data.section || ""}`, pageWidth / 2, y, { align: "center" });
  
  y += 15;
  doc.setFontSize(14);
  doc.setTextColor(...darkColor);
  doc.text("for achieving excellence in", pageWidth / 2, y, { align: "center" });
  
  y += 12;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...goldColor);
  doc.text(`"${data.achievement}"`, pageWidth / 2, y, { align: "center" });
  
  if (data.examName) {
    y += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkColor);
    doc.text(`in ${data.examName}`, pageWidth / 2, y, { align: "center" });
  }
  
  if (data.percentage) {
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text(`Percentage: ${data.percentage}%`, pageWidth / 2, y, { align: "center" });
  }
  
  y += 15;
  doc.setFontSize(14);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...grayColor);
  doc.text("Your dedication and hard work are truly commendable.", pageWidth / 2, y, { align: "center" });
  
  // Signatures
  const sigY = doc.internal.pageSize.getHeight() - 40;
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  
  doc.line(40, sigY, 100, sigY);
  doc.line(pageWidth - 100, sigY, pageWidth - 40, sigY);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text("Class Teacher", 70, sigY + 6, { align: "center" });
  doc.text("Principal", pageWidth - 70, sigY + 6, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text(`Date: ${formatDate()}`, pageWidth / 2, sigY + 6, { align: "center" });
  
  return doc;
};

// 5. Sports Certificate
export const generateSportsCertificate = async (data: SportsCertData) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  await addWatermark(doc, 0.04);
  drawCertificateBorder(doc);
  const yStart = await drawCertificateHeader(doc, "SPORTS ACHIEVEMENT CERTIFICATE", data.schoolName, data.schoolAddress);
  
  let y = yStart + 5;
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text("This is to certify that", pageWidth / 2, y, { align: "center" });
  
  y += 15;
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(data.studentName, pageWidth / 2, y, { align: "center" });
  
  y += 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text(`S/o ${data.fatherName || "_______________"} | Class: ${data.className} ${data.section || ""}`, pageWidth / 2, y, { align: "center" });
  
  y += 15;
  doc.setFontSize(14);
  doc.setTextColor(...darkColor);
  doc.text("has achieved", pageWidth / 2, y, { align: "center" });
  
  y += 12;
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...goldColor);
  doc.text(`${data.position} POSITION`, pageWidth / 2, y, { align: "center" });
  
  y += 12;
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text(`in ${data.sportName}`, pageWidth / 2, y, { align: "center" });
  
  y += 10;
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text(`"${data.eventName}"`, pageWidth / 2, y, { align: "center" });
  
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...grayColor);
  doc.text(`held on ${formatDate(data.eventDate)}`, pageWidth / 2, y, { align: "center" });
  
  // Signatures
  const sigY = doc.internal.pageSize.getHeight() - 40;
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  
  doc.line(40, sigY, 100, sigY);
  doc.line(pageWidth / 2 - 30, sigY, pageWidth / 2 + 30, sigY);
  doc.line(pageWidth - 100, sigY, pageWidth - 40, sigY);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text("Sports Incharge", 70, sigY + 6, { align: "center" });
  doc.text("Games Master", pageWidth / 2, sigY + 6, { align: "center" });
  doc.text("Principal", pageWidth - 70, sigY + 6, { align: "center" });
  
  return doc;
};

// 6. Staff Experience Certificate
export const generateExperienceCertificate = async (data: ExperienceCertData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  await addWatermark(doc, 0.04);
  drawCertificateBorder(doc);
  const yStart = await drawCertificateHeader(doc, "EXPERIENCE CERTIFICATE", data.schoolName, data.schoolAddress);
  
  let y = yStart + 15;
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text("To Whom It May Concern", pageWidth / 2, y, { align: "center" });
  
  y += 20;
  const margin = 30;
  const lineHeight = 8;
  
  doc.setFontSize(12);
  const text1 = `This is to certify that `;
  const text2 = data.employeeName;
  const text3 = ` has served as `;
  const text4 = data.designation;
  const text5 = data.department ? ` in the ${data.department} department` : "";
  const text6 = ` at ${data.schoolName || SCHOOL_NAME} from `;
  const text7 = formatDate(data.joiningDate);
  const text8 = data.leavingDate ? ` to ${formatDate(data.leavingDate)}` : " to present";
  const text9 = ".";
  
  doc.setFont("helvetica", "normal");
  let x = margin;
  doc.text(text1, x, y);
  x += doc.getTextWidth(text1);
  doc.setFont("helvetica", "bold");
  doc.text(text2, x, y);
  x += doc.getTextWidth(text2);
  doc.setFont("helvetica", "normal");
  doc.text(text3, x, y);
  
  y += lineHeight;
  x = margin;
  doc.setFont("helvetica", "bold");
  doc.text(text4, x, y);
  x += doc.getTextWidth(text4);
  doc.setFont("helvetica", "normal");
  doc.text(text5 + text6, x, y);
  
  y += lineHeight;
  x = margin;
  doc.setFont("helvetica", "bold");
  doc.text(text7 + text8 + text9, x, y);
  
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.text("During their tenure, they have demonstrated excellent skills, dedication,", margin, y);
  y += lineHeight;
  doc.text("and professionalism in their duties. Their conduct has been exemplary.", margin, y);
  
  if (data.remarks) {
    y += 15;
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...grayColor);
    const lines = doc.splitTextToSize(data.remarks, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 6;
  }
  
  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text("We wish them all the best in their future endeavors.", margin, y);
  
  // Signature
  const sigY = doc.internal.pageSize.getHeight() - 55;
  
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Principal", pageWidth - 45, sigY + 6, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text(`Issue Date: ${formatDate()}`, 25, sigY + 6);
  
  drawStyledFooter(doc, 1, 1, data.schoolAddress || SCHOOL_ADDRESS);
  
  return doc;
};

// 7. Monthly Progress Report
export const generateMonthlyProgressReport = async (data: MonthlyProgressData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  
  await addWatermark(doc, 0.04);
  
  // Header
  const logoImg = await loadLogo();
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setFillColor(...goldColor);
  doc.rect(0, 40, pageWidth, 2, "F");
  
  if (logoImg) {
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(1.5);
    doc.circle(25, 20, 14);
    doc.setFillColor(255, 255, 255);
    doc.circle(25, 20, 12, 'F');
    doc.addImage(logoImg, "PNG", 13, 8, 24, 24);
  }
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.schoolName || SCHOOL_NAME, pageWidth / 2 + 10, 18, { align: "center" });
  doc.setFontSize(12);
  doc.text("MONTHLY PROGRESS REPORT", pageWidth / 2 + 10, 28, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.month} ${data.year}`, pageWidth / 2 + 10, 36, { align: "center" });
  
  // Student info box
  let y = 52;
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 3, 3, "F");
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 3, 3, "S");
  
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.text("Student Name:", margin + 5, y + 10);
  doc.text("Father Name:", margin + 5, y + 18);
  doc.text("Class:", margin + 5, y + 26);
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.studentName, margin + 35, y + 10);
  doc.text(data.fatherName || "-", margin + 35, y + 18);
  doc.text(`${data.className} ${data.section || ""}`, margin + 25, y + 26);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Student ID:", pageWidth / 2, y + 10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.studentId, pageWidth / 2 + 25, y + 10);
  
  y += 40;
  
  // Attendance section
  if (data.attendance) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Attendance Summary", margin, y);
    
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkColor);
    doc.text(`Present: ${data.attendance.present} days`, margin + 5, y);
    doc.text(`Absent: ${data.attendance.absent} days`, margin + 50, y);
    doc.text(`Total: ${data.attendance.total} days`, margin + 95, y);
    
    const percentage = ((data.attendance.present / data.attendance.total) * 100).toFixed(1);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(parseFloat(percentage) >= 75 ? primaryColor : [200, 50, 50] as [number, number, number]));
    doc.text(`Attendance: ${percentage}%`, margin + 140, y);
    
    y += 15;
  }
  
  // Grades section
  if (data.grades && data.grades.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Subject-wise Grades", margin, y);
    
    y += 8;
    doc.setFillColor(...primaryColor);
    doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("Subject", margin + 5, y + 5.5);
    doc.text("Grade", pageWidth - margin - 20, y + 5.5, { align: "center" });
    
    y += 8;
    data.grades.forEach((grade, index) => {
      doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 252);
      doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
      doc.setTextColor(...darkColor);
      doc.setFont("helvetica", "normal");
      doc.text(grade.subject, margin + 5, y + 5);
      doc.setFont("helvetica", "bold");
      doc.text(grade.grade, pageWidth - margin - 20, y + 5, { align: "center" });
      y += 7;
    });
    
    y += 10;
  }
  
  // Teacher remarks
  if (data.teacherRemarks) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Teacher's Remarks", margin, y);
    
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...grayColor);
    const lines = doc.splitTextToSize(data.teacherRemarks, pageWidth - margin * 2);
    doc.text(lines, margin, y);
  }
  
  // Signature
  const sigY = doc.internal.pageSize.getHeight() - 35;
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  doc.line(pageWidth - 60, sigY, pageWidth - margin, sigY);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text("Class Teacher", pageWidth - 37, sigY + 6, { align: "center" });
  
  drawStyledFooter(doc, 1, 1, data.schoolAddress || SCHOOL_ADDRESS);
  
  return doc;
};

// 8. Annual Progress Report
export const generateAnnualProgressReport = async (data: AnnualProgressData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  
  await addWatermark(doc, 0.04);
  
  // Header
  const logoImg = await loadLogo();
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setFillColor(...goldColor);
  doc.rect(0, 40, pageWidth, 2, "F");
  
  if (logoImg) {
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(1.5);
    doc.circle(25, 20, 14);
    doc.setFillColor(255, 255, 255);
    doc.circle(25, 20, 12, 'F');
    doc.addImage(logoImg, "PNG", 13, 8, 24, 24);
  }
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.schoolName || SCHOOL_NAME, pageWidth / 2 + 10, 18, { align: "center" });
  doc.setFontSize(12);
  doc.text("ANNUAL PROGRESS REPORT", pageWidth / 2 + 10, 28, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Session: ${data.session}`, pageWidth / 2 + 10, 36, { align: "center" });
  
  // Student info
  let y = 52;
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 25, 3, 3, "F");
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 25, 3, 3, "S");
  
  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.text("Name:", margin + 5, y + 10);
  doc.text("Father:", margin + 5, y + 18);
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.studentName, margin + 22, y + 10);
  doc.text(data.fatherName || "-", margin + 22, y + 18);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Class:", pageWidth / 2 - 20, y + 10);
  doc.text("ID:", pageWidth / 2 - 20, y + 18);
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(`${data.className} ${data.section || ""}`, pageWidth / 2, y + 10);
  doc.text(data.studentId, pageWidth / 2, y + 18);
  
  if (data.rank) {
    doc.setTextColor(...grayColor);
    doc.text("Rank:", pageWidth - 50, y + 10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...goldColor);
    doc.text(data.rank, pageWidth - 35, y + 10);
  }
  
  y += 35;
  
  // Grades table
  if (data.grades && data.grades.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Subject-wise Performance", margin, y);
    
    y += 8;
    doc.setFillColor(...primaryColor);
    doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("Subject", margin + 5, y + 5.5);
    doc.text("Marks", pageWidth - margin - 50, y + 5.5, { align: "center" });
    doc.text("Grade", pageWidth - margin - 15, y + 5.5, { align: "center" });
    
    y += 8;
    data.grades.forEach((grade, index) => {
      doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 252);
      doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
      doc.setTextColor(...darkColor);
      doc.setFont("helvetica", "normal");
      doc.text(grade.subject, margin + 5, y + 5);
      doc.text(String(grade.marks), pageWidth - margin - 50, y + 5, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text(grade.grade, pageWidth - margin - 15, y + 5, { align: "center" });
      y += 7;
    });
    
    y += 5;
  }
  
  // Overall grade
  if (data.overallGrade) {
    doc.setFillColor(255, 248, 220);
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, y, 60, 12, 2, 2, 'FD');
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Overall Grade:", margin + 3, y + 8);
    doc.setFontSize(12);
    doc.setTextColor(...goldColor);
    doc.text(data.overallGrade, margin + 45, y + 8);
    y += 18;
  }
  
  // Attendance
  if (data.attendance) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Annual Attendance:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkColor);
    const attPct = ((data.attendance.present / data.attendance.total) * 100).toFixed(1);
    doc.text(`${data.attendance.present}/${data.attendance.total} days (${attPct}%)`, margin + 45, y);
    y += 12;
  }
  
  // Remarks
  if (data.teacherRemarks) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Teacher's Remarks:", margin, y);
    y += 6;
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...grayColor);
    doc.text(data.teacherRemarks, margin, y);
    y += 10;
  }
  
  if (data.principalRemarks) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Principal's Remarks:", margin, y);
    y += 6;
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...grayColor);
    doc.text(data.principalRemarks, margin, y);
  }
  
  // Signatures
  const sigY = doc.internal.pageSize.getHeight() - 35;
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  doc.line(margin, sigY, margin + 45, sigY);
  doc.line(pageWidth - margin - 45, sigY, pageWidth - margin, sigY);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text("Class Teacher", margin + 22, sigY + 6, { align: "center" });
  doc.text("Principal", pageWidth - margin - 22, sigY + 6, { align: "center" });
  
  drawStyledFooter(doc, 1, 1, data.schoolAddress || SCHOOL_ADDRESS);
  
  return doc;
};

// 9. School Leaving Certificate (SLC)
export const generateSLCCertificate = async (data: SLCData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  
  await addWatermark(doc, 0.04);
  drawCertificateBorder(doc);
  const yStart = await drawCertificateHeader(doc, "SCHOOL LEAVING CERTIFICATE", data.schoolName, data.schoolAddress);
  
  let y = yStart + 5;
  
  // Certificate number
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(`Certificate No: ${data.certificateNumber}`, margin, y);
  doc.text(`Date: ${formatDate()}`, pageWidth - margin, y, { align: "right" });
  
  y += 15;
  const lineHeight = 10;
  const labelWidth = 55;
  
  const fields = [
    { label: "Name of Student", value: data.studentName },
    { label: "Father's Name", value: data.fatherName || "-" },
    { label: "Student ID", value: data.studentId },
    { label: "Class", value: `${data.className} ${data.section || ""}` },
    { label: "Date of Birth", value: formatDate(data.dateOfBirth) },
    { label: "Date of Admission", value: formatDate(data.admissionDate) },
    { label: "Date of Leaving", value: formatDate(data.leavingDate) },
    { label: "Last Class Attended", value: data.lastClassAttended },
    { label: "Last Exam Passed", value: data.lastExamPassed || "-" },
    { label: "Reason for Leaving", value: data.reasonForLeaving },
    { label: "Conduct", value: data.conduct || "Good" },
    { label: "Character", value: data.characterRemarks || "Good" },
  ];
  
  doc.setFontSize(10);
  fields.forEach((field) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayColor);
    doc.text(`${field.label}:`, margin, y);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkColor);
    doc.text(field.value, margin + labelWidth, y);
    
    // Dotted line
    doc.setDrawColor(...grayColor);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin + labelWidth, y + 1, pageWidth - margin, y + 1);
    doc.setLineDashPattern([], 0);
    
    y += lineHeight;
  });
  
  y += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text("This certificate is issued on the request of the student/guardian.", margin, y);
  
  // Official seal and signature
  const sigY = doc.internal.pageSize.getHeight() - 55;
  
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(1.5);
  doc.circle(pageWidth / 2, sigY - 5, 15);
  doc.setFontSize(6);
  doc.setTextColor(...primaryColor);
  doc.text("OFFICIAL", pageWidth / 2, sigY - 7, { align: "center" });
  doc.text("SEAL", pageWidth / 2, sigY - 3, { align: "center" });
  
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  doc.line(pageWidth - 70, sigY + 15, pageWidth - 20, sigY + 15);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text("Principal", pageWidth - 45, sigY + 21, { align: "center" });
  
  drawStyledFooter(doc, 1, 1, data.schoolAddress || SCHOOL_ADDRESS);
  
  return doc;
};
