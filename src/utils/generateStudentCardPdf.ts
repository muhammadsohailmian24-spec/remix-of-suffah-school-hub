import jsPDF from "jspdf";
import QRCode from "qrcode";

// Modern color palette - matching school theme
const primaryColor: [number, number, number] = [30, 100, 180]; // Royal Blue
const accentColor: [number, number, number] = [200, 35, 70]; // Modern magenta/crimson accent
const goldColor: [number, number, number] = [180, 140, 50];
const darkColor: [number, number, number] = [40, 40, 40];
const whiteColor: [number, number, number] = [255, 255, 255];
const lightGray: [number, number, number] = [245, 245, 245];

export interface StudentCardData {
  studentId: string;
  studentName: string;
  fatherName: string;
  className: string;
  section?: string;
  bloodGroup?: string;
  phone?: string;
  address?: string;
  photoUrl?: string;
  dateOfBirth?: string;
  validUntil?: string;
  joinDate?: string;
  schoolName?: string;
  schoolAddress?: string;
}

const loadLogo = async (): Promise<HTMLImageElement | null> => {
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = reject;
      logoImg.src = "/images/school-logo.png";
    });
    return logoImg;
  } catch (e) {
    return null;
  }
};

const generateQRCodeImage = async (studentId: string): Promise<string> => {
  try {
    const qrDataUrl = await QRCode.toDataURL(studentId, {
      width: 150,
      margin: 1,
      color: {
        dark: "#1E64B4",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    });
    return qrDataUrl;
  } catch (e) {
    console.error("QR Code generation failed:", e);
    return "";
  }
};

export const generateStudentCardPdf = async (data: StudentCardData): Promise<jsPDF> => {
  // Card size: 85.6mm x 53.98mm (standard ID card size - CR80)
  const cardWidth = 85.6;
  const cardHeight = 53.98;
  
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [cardHeight, cardWidth],
  });

  const logoImg = await loadLogo();
  const qrCodeImg = await generateQRCodeImage(data.studentId);
  const schoolName = data.schoolName || "The Suffah Public School & College";

  // ===== FRONT SIDE =====
  
  // White background
  doc.setFillColor(...whiteColor);
  doc.rect(0, 0, cardWidth, cardHeight, "F");

  // Top accent stripe with gradient effect
  doc.setFillColor(...accentColor);
  doc.rect(0, 0, cardWidth, 3, "F");
  
  // Decorative curved element at top-right corner
  doc.setFillColor(...accentColor);
  // Simulated lanyard holder visual (top right corner decorative element)
  doc.ellipse(cardWidth - 5, -5, 12, 12, "F");

  // Logo placement - top left with elegant positioning
  if (logoImg) {
    doc.addImage(logoImg, "PNG", 4, 5, 12, 12);
  }
  
  // School name - elegant typography
  doc.setTextColor(...primaryColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName, 18, 10);
  
  // Subtitle
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("STUDENT IDENTITY CARD", 18, 14);

  // Photo area - centered with elegant border
  const photoX = cardWidth / 2 - 10;
  const photoY = 18;
  const photoSize = 20;
  
  // Photo background circle/frame
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.4);
  doc.roundedRect(photoX, photoY, photoSize, photoSize, 2, 2, "FD");
  
  if (data.photoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          doc.addImage(img, "JPEG", photoX + 0.5, photoY + 0.5, photoSize - 1, photoSize - 1);
          resolve();
        };
        img.onerror = reject;
        img.src = data.photoUrl!;
      });
    } catch (e) {
      doc.setFontSize(6);
      doc.setTextColor(...primaryColor);
      doc.text("Photo", photoX + photoSize / 2, photoY + photoSize / 2, { align: "center" });
    }
  } else {
    doc.setFontSize(6);
    doc.setTextColor(...primaryColor);
    doc.text("Photo", photoX + photoSize / 2, photoY + photoSize / 2 + 2, { align: "center" });
  }

  // Student name - centered below photo
  doc.setTextColor(...darkColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(data.studentName, cardWidth / 2, 42, { align: "center" });
  
  // Class/Section
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...primaryColor);
  const classText = `Class ${data.className}${data.section ? ` - ${data.section}` : ""}`;
  doc.text(classText, cardWidth / 2, 46, { align: "center" });

  // Details - left side
  const leftDetailsX = 5;
  let leftY = 22;
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(5.5);
  
  const leftDetails = [
    { label: "ID", value: data.studentId },
    { label: "DOB", value: data.dateOfBirth || "N/A" },
    { label: "Phone", value: data.phone || "N/A" },
  ];
  
  leftDetails.forEach((detail) => {
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text(detail.label, leftDetailsX, leftY);
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${detail.value}`, leftDetailsX + 8, leftY);
    leftY += 4;
  });

  // QR Code - bottom left corner
  if (qrCodeImg) {
    doc.addImage(qrCodeImg, "PNG", 3, cardHeight - 16, 14, 14);
  }

  // Join/Expire dates - bottom center
  doc.setFontSize(5);
  doc.setTextColor(...accentColor);
  doc.setFont("helvetica", "bold");
  doc.text("Join", 22, cardHeight - 8);
  doc.text("Expire", 22, cardHeight - 4);
  
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${data.joinDate || "2024"}`, 30, cardHeight - 8);
  doc.text(`: ${data.validUntil || "2026"}`, 30, cardHeight - 4);

  // Bottom accent bar
  doc.setFillColor(...goldColor);
  doc.rect(0, cardHeight - 2, cardWidth, 2, "F");

  // ===== BACK SIDE =====
  doc.addPage([cardHeight, cardWidth], "landscape");

  // White background
  doc.setFillColor(...whiteColor);
  doc.rect(0, 0, cardWidth, cardHeight, "F");

  // Top accent
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, cardWidth, 2, "F");

  // Header with logo
  if (logoImg) {
    doc.addImage(logoImg, "PNG", cardWidth / 2 - 5, 4, 10, 10);
  }

  doc.setTextColor(...primaryColor);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName, cardWidth / 2, 17, { align: "center" });
  
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(data.schoolAddress || "Madyan Swat, Pakistan", cardWidth / 2, 21, { align: "center" });

  // Divider line
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(0.3);
  doc.line(10, 24, cardWidth - 10, 24);

  // Parent/Guardian info
  let backY = 28;
  doc.setTextColor(...darkColor);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("Father/Guardian:", 5, backY);
  doc.setFont("helvetica", "normal");
  doc.text(data.fatherName, 30, backY);
  
  backY += 4;
  if (data.bloodGroup) {
    doc.setFont("helvetica", "bold");
    doc.text("Blood Group:", 5, backY);
    doc.setFont("helvetica", "normal");
    doc.text(data.bloodGroup, 30, backY);
    backY += 4;
  }
  
  if (data.address) {
    doc.setFont("helvetica", "bold");
    doc.text("Address:", 5, backY);
    doc.setFont("helvetica", "normal");
    const addressLines = doc.splitTextToSize(data.address, 50);
    doc.text(addressLines, 30, backY);
  }

  // Important note
  doc.setFillColor(...lightGray);
  doc.roundedRect(4, cardHeight - 16, cardWidth - 8, 10, 1, 1, "F");
  
  doc.setFontSize(5);
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "italic");
  doc.text("This card must be carried at all times. Report loss immediately.", cardWidth / 2, cardHeight - 11, { align: "center" });
  doc.text("Scan QR code for attendance marking.", cardWidth / 2, cardHeight - 7, { align: "center" });

  // Bottom accent
  doc.setFillColor(...goldColor);
  doc.rect(0, cardHeight - 2, cardWidth, 2, "F");

  return doc;
};

export const downloadStudentCard = async (data: StudentCardData) => {
  const doc = await generateStudentCardPdf(data);
  doc.save(`StudentCard-${data.studentId}.pdf`);
};

export const generateBulkStudentCards = async (students: StudentCardData[]): Promise<jsPDF> => {
  const cardWidth = 85.6;
  const cardHeight = 53.98;
  
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [cardHeight, cardWidth],
  });

  const logoImg = await loadLogo();

  for (let i = 0; i < students.length; i++) {
    if (i > 0) {
      doc.addPage([cardHeight, cardWidth], "landscape");
    }

    const data = students[i];
    const qrCodeImg = await generateQRCodeImage(data.studentId);
    const schoolName = data.schoolName || "The Suffah Public School & College";

    // ===== FRONT SIDE =====
    doc.setFillColor(...whiteColor);
    doc.rect(0, 0, cardWidth, cardHeight, "F");

    doc.setFillColor(...accentColor);
    doc.rect(0, 0, cardWidth, 3, "F");
    doc.ellipse(cardWidth - 5, -5, 12, 12, "F");

    if (logoImg) {
      doc.addImage(logoImg, "PNG", 4, 5, 12, 12);
    }
    
    doc.setTextColor(...primaryColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName, 18, 10);
    
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("STUDENT IDENTITY CARD", 18, 14);

    const photoX = cardWidth / 2 - 10;
    const photoY = 18;
    const photoSize = 20;
    
    doc.setFillColor(...lightGray);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(photoX, photoY, photoSize, photoSize, 2, 2, "FD");
    
    if (data.photoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            doc.addImage(img, "JPEG", photoX + 0.5, photoY + 0.5, photoSize - 1, photoSize - 1);
            resolve();
          };
          img.onerror = reject;
          img.src = data.photoUrl!;
        });
      } catch (e) {
        doc.setFontSize(6);
        doc.setTextColor(...primaryColor);
        doc.text("Photo", photoX + photoSize / 2, photoY + photoSize / 2 + 2, { align: "center" });
      }
    } else {
      doc.setFontSize(6);
      doc.setTextColor(...primaryColor);
      doc.text("Photo", photoX + photoSize / 2, photoY + photoSize / 2 + 2, { align: "center" });
    }

    doc.setTextColor(...darkColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(data.studentName, cardWidth / 2, 42, { align: "center" });
    
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...primaryColor);
    const classText = `Class ${data.className}${data.section ? ` - ${data.section}` : ""}`;
    doc.text(classText, cardWidth / 2, 46, { align: "center" });

    const leftDetailsX = 5;
    let leftY = 22;
    
    doc.setTextColor(...darkColor);
    doc.setFontSize(5.5);
    
    const leftDetails = [
      { label: "ID", value: data.studentId },
      { label: "DOB", value: data.dateOfBirth || "N/A" },
      { label: "Phone", value: data.phone || "N/A" },
    ];
    
    leftDetails.forEach((detail) => {
      doc.setTextColor(...primaryColor);
      doc.setFont("helvetica", "bold");
      doc.text(detail.label, leftDetailsX, leftY);
      doc.setTextColor(...darkColor);
      doc.setFont("helvetica", "normal");
      doc.text(`: ${detail.value}`, leftDetailsX + 8, leftY);
      leftY += 4;
    });

    if (qrCodeImg) {
      doc.addImage(qrCodeImg, "PNG", 3, cardHeight - 16, 14, 14);
    }

    doc.setFontSize(5);
    doc.setTextColor(...accentColor);
    doc.setFont("helvetica", "bold");
    doc.text("Join", 22, cardHeight - 8);
    doc.text("Expire", 22, cardHeight - 4);
    
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${data.joinDate || "2024"}`, 30, cardHeight - 8);
    doc.text(`: ${data.validUntil || "2026"}`, 30, cardHeight - 4);

    doc.setFillColor(...goldColor);
    doc.rect(0, cardHeight - 2, cardWidth, 2, "F");

    // ===== BACK SIDE =====
    doc.addPage([cardHeight, cardWidth], "landscape");

    doc.setFillColor(...whiteColor);
    doc.rect(0, 0, cardWidth, cardHeight, "F");

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, cardWidth, 2, "F");

    if (logoImg) {
      doc.addImage(logoImg, "PNG", cardWidth / 2 - 5, 4, 10, 10);
    }

    doc.setTextColor(...primaryColor);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName, cardWidth / 2, 17, { align: "center" });
    
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(data.schoolAddress || "Madyan Swat, Pakistan", cardWidth / 2, 21, { align: "center" });

    doc.setDrawColor(...goldColor);
    doc.setLineWidth(0.3);
    doc.line(10, 24, cardWidth - 10, 24);

    let backY = 28;
    doc.setTextColor(...darkColor);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text("Father/Guardian:", 5, backY);
    doc.setFont("helvetica", "normal");
    doc.text(data.fatherName, 30, backY);
    
    backY += 4;
    if (data.bloodGroup) {
      doc.setFont("helvetica", "bold");
      doc.text("Blood Group:", 5, backY);
      doc.setFont("helvetica", "normal");
      doc.text(data.bloodGroup, 30, backY);
      backY += 4;
    }
    
    if (data.address) {
      doc.setFont("helvetica", "bold");
      doc.text("Address:", 5, backY);
      doc.setFont("helvetica", "normal");
      const addressLines = doc.splitTextToSize(data.address, 50);
      doc.text(addressLines, 30, backY);
    }

    doc.setFillColor(...lightGray);
    doc.roundedRect(4, cardHeight - 16, cardWidth - 8, 10, 1, 1, "F");
    
    doc.setFontSize(5);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "italic");
    doc.text("This card must be carried at all times. Report loss immediately.", cardWidth / 2, cardHeight - 11, { align: "center" });
    doc.text("Scan QR code for attendance marking.", cardWidth / 2, cardHeight - 7, { align: "center" });

    doc.setFillColor(...goldColor);
    doc.rect(0, cardHeight - 2, cardWidth, 2, "F");
  }

  return doc;
};

export const downloadBulkStudentCards = async (students: StudentCardData[], className?: string) => {
  const doc = await generateBulkStudentCards(students);
  const filename = className ? `StudentCards-${className.replace(/\s+/g, "-")}` : "StudentCards";
  doc.save(`${filename}.pdf`);
};
