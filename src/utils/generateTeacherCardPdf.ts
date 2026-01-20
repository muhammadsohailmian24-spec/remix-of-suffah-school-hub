import jsPDF from "jspdf";
import QRCode from "qrcode";
import { primaryColor, goldColor, darkColor, grayColor } from "./pdfDesignUtils";

// Teacher cards use green theme for distinction, with gold accents
const teacherPrimary: [number, number, number] = [20, 100, 60]; // Dark green
const whiteColor: [number, number, number] = [255, 255, 255];
const lightGreen: [number, number, number] = [230, 245, 235];

export interface TeacherCardData {
  employeeId: string;
  teacherName: string;
  department?: string;
  qualification?: string;
  specialization?: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  joiningDate?: string;
  validUntil?: string;
  bloodGroup?: string;
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

const generateQRCodeImage = async (employeeId: string): Promise<string> => {
  try {
    const qrDataUrl = await QRCode.toDataURL(employeeId, {
      width: 200,
      margin: 1,
      color: {
        dark: "#14643C",
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

// Draw curved wave with green theme
const drawGreenWave = (doc: jsPDF, cardWidth: number, startY: number, endY: number) => {
  const colors: [number, number, number][] = [
    [15, 80, 45],
    [18, 90, 52],
    [20, 100, 60],
  ];
  
  colors.forEach((color, index) => {
    doc.setFillColor(...color);
    const yOffset = startY + (index * 2.5);
    
    for (let x = 0; x <= cardWidth; x += 0.3) {
      const waveY = yOffset + Math.sin((x / cardWidth) * Math.PI * 1.5) * 3;
      doc.rect(x, waveY, 0.4, endY - waveY, "F");
    }
  });
};

export const generateTeacherCardPdf = async (data: TeacherCardData): Promise<jsPDF> => {
  const cardWidth = 54;
  const cardHeight = 86;
  
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [cardWidth, cardHeight],
  });

  const logoImg = await loadLogo();
  const qrCodeImg = await generateQRCodeImage(data.employeeId);
  const schoolName = data.schoolName || "The Suffah Public School & College";

  // ===== FRONT SIDE =====
  
  // White background
  doc.setFillColor(...whiteColor);
  doc.rect(0, 0, cardWidth, cardHeight, "F");
  
  // Dark green header
  doc.setFillColor(...teacherPrimary);
  doc.rect(0, 0, cardWidth, 28, "F");
  
  // Curved bottom of header
  for (let x = 0; x <= cardWidth; x += 0.2) {
    const curveY = 28 + Math.sin((x / cardWidth) * Math.PI) * 4;
    doc.rect(x, 28, 0.3, curveY - 28 + 0.5, "F");
  }

  // Logo circle with golden border
  const logoRadius = 8;
  const logoCenterX = cardWidth / 2;
  const logoCenterY = 10;
  
  doc.setFillColor(...goldColor);
  doc.circle(logoCenterX, logoCenterY, logoRadius + 1.5, "F");
  doc.setFillColor(...whiteColor);
  doc.circle(logoCenterX, logoCenterY, logoRadius, "F");
  
  if (logoImg) {
    const logoSize = logoRadius * 1.6;
    doc.addImage(logoImg, "PNG", logoCenterX - logoSize/2, logoCenterY - logoSize/2, logoSize, logoSize);
  }
  
  // School name
  doc.setTextColor(...whiteColor);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName, cardWidth / 2, 22, { align: "center" });
  
  // Subtitle
  doc.setFontSize(4);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 230, 210);
  doc.text("TEACHER IDENTITY CARD", cardWidth / 2, 26, { align: "center" });

  // Photo area - circular with golden border
  const photoRadius = 12;
  const photoCenterX = cardWidth / 2;
  const photoCenterY = 44;
  
  doc.setFillColor(...goldColor);
  doc.circle(photoCenterX, photoCenterY, photoRadius + 1.5, "F");
  doc.setFillColor(...lightGreen);
  doc.circle(photoCenterX, photoCenterY, photoRadius, "F");
  
  if (data.photoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          const imgSize = photoRadius * 1.8;
          doc.addImage(img, "JPEG", photoCenterX - imgSize/2, photoCenterY - imgSize/2, imgSize, imgSize);
          resolve();
        };
        img.onerror = reject;
        img.src = data.photoUrl!;
      });
    } catch (e) {
      doc.setFillColor(150, 150, 150);
      doc.circle(photoCenterX, photoCenterY - 2, 4, "F");
      doc.ellipse(photoCenterX, photoCenterY + 5, 5, 3, "F");
    }
  } else {
    doc.setFillColor(150, 150, 150);
    doc.circle(photoCenterX, photoCenterY - 2, 4, "F");
    doc.ellipse(photoCenterX, photoCenterY + 5, 5, 3, "F");
  }

  // Teacher name
  doc.setTextColor(...teacherPrimary);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(data.teacherName.toUpperCase(), cardWidth / 2, 60, { align: "center" });
  
  // Department
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text(data.department || "Teaching Staff", cardWidth / 2, 64, { align: "center" });

  // Details section
  const detailStartY = 68;
  doc.setFontSize(5);
  
  const details = [
    { label: "ID", value: data.employeeId },
    { label: "Phone", value: data.phone || "N/A" },
    { label: "Qual.", value: data.qualification || "N/A" },
  ];
  
  details.forEach((detail, index) => {
    const y = detailStartY + (index * 4);
    
    doc.setTextColor(...teacherPrimary);
    doc.setFont("helvetica", "bold");
    doc.text(detail.label, 6, y);
    
    doc.setTextColor(...grayColor);
    doc.text(":", 15, y);
    
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "normal");
    doc.text(detail.value, 18, y);
  });

  // Bottom wave
  drawGreenWave(doc, cardWidth, cardHeight - 8, cardHeight);

  // ===== BACK SIDE =====
  doc.addPage([cardWidth, cardHeight], "portrait");

  // White background
  doc.setFillColor(...whiteColor);
  doc.rect(0, 0, cardWidth, cardHeight, "F");

  // Small logo at top
  const backLogoRadius = 5;
  const backLogoCenterY = 7;
  
  doc.setFillColor(...goldColor);
  doc.circle(cardWidth / 2, backLogoCenterY, backLogoRadius + 1, "F");
  doc.setFillColor(...whiteColor);
  doc.circle(cardWidth / 2, backLogoCenterY, backLogoRadius, "F");
  
  if (logoImg) {
    const logoSize = backLogoRadius * 1.6;
    doc.addImage(logoImg, "PNG", cardWidth / 2 - logoSize/2, backLogoCenterY - logoSize/2, logoSize, logoSize);
  }

  // School name
  doc.setTextColor(...teacherPrimary);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName, cardWidth / 2, 15, { align: "center" });
  
  // Address
  doc.setFontSize(4);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...grayColor);
  doc.text(data.schoolAddress || "Madyan Swat, Pakistan", cardWidth / 2, 19, { align: "center" });

  // Golden divider
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(0.4);
  doc.line(10, 22, cardWidth - 10, 22);

  // Terms section
  doc.setTextColor(...teacherPrimary);
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.text("Terms and Conditions", cardWidth / 2, 27, { align: "center" });
  
  doc.setFontSize(3.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  
  const terms = [
    "This card must be worn at all times on campus.",
    "Report loss immediately to the administration.",
    "This card is non-transferable.",
  ];
  
  terms.forEach((term, index) => {
    doc.text(term, cardWidth / 2, 32 + (index * 3.5), { align: "center" });
  });

  // Additional info
  doc.setFontSize(4);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...teacherPrimary);
  doc.text("Specialization:", 6, 46);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text(data.specialization || "N/A", 6, 50);
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...teacherPrimary);
  doc.text("Blood Group:", 6, 55);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text(data.bloodGroup || "N/A", 26, 55);

  // QR Code
  if (qrCodeImg) {
    const qrSize = 16;
    const qrX = cardWidth / 2 - qrSize / 2;
    const qrY = 59;
    
    doc.setFillColor(...lightGreen);
    doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 3, 3, "F");
    
    doc.addImage(qrCodeImg, "PNG", qrX, qrY, qrSize, qrSize);
  }

  // Issue/Expire dates
  doc.setFontSize(3.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Joining: ${data.joiningDate || "01/01/25"}`, 6, cardHeight - 10);
  doc.text(`Valid till: ${data.validUntil || "12/12/26"}`, cardWidth - 6, cardHeight - 10, { align: "right" });

  // Bottom wave
  drawGreenWave(doc, cardWidth, cardHeight - 6, cardHeight);

  return doc;
};

export const downloadTeacherCard = async (data: TeacherCardData) => {
  const doc = await generateTeacherCardPdf(data);
  doc.save(`TeacherCard-${data.employeeId}.pdf`);
};

export const generateBulkTeacherCards = async (teachers: TeacherCardData[]): Promise<jsPDF> => {
  const cardWidth = 54;
  const cardHeight = 86;
  
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [cardWidth, cardHeight],
  });

  const logoImg = await loadLogo();

  for (let i = 0; i < teachers.length; i++) {
    if (i > 0) {
      doc.addPage([cardWidth, cardHeight], "portrait");
    }

    const data = teachers[i];
    const qrCodeImg = await generateQRCodeImage(data.employeeId);
    const schoolName = data.schoolName || "The Suffah Public School & College";

    // Front side
    doc.setFillColor(...whiteColor);
    doc.rect(0, 0, cardWidth, cardHeight, "F");
    
    doc.setFillColor(...teacherPrimary);
    doc.rect(0, 0, cardWidth, 28, "F");
    
    for (let x = 0; x <= cardWidth; x += 0.2) {
      const curveY = 28 + Math.sin((x / cardWidth) * Math.PI) * 4;
      doc.rect(x, 28, 0.3, curveY - 28 + 0.5, "F");
    }

    const logoRadius = 8;
    doc.setFillColor(...goldColor);
    doc.circle(cardWidth / 2, 10, logoRadius + 1.5, "F");
    doc.setFillColor(...whiteColor);
    doc.circle(cardWidth / 2, 10, logoRadius, "F");
    
    if (logoImg) {
      const logoSize = logoRadius * 1.6;
      doc.addImage(logoImg, "PNG", cardWidth / 2 - logoSize/2, 10 - logoSize/2, logoSize, logoSize);
    }
    
    doc.setTextColor(...whiteColor);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName, cardWidth / 2, 22, { align: "center" });
    
    doc.setFontSize(4);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 230, 210);
    doc.text("TEACHER IDENTITY CARD", cardWidth / 2, 26, { align: "center" });

    const photoRadius = 12;
    doc.setFillColor(...goldColor);
    doc.circle(cardWidth / 2, 44, photoRadius + 1.5, "F");
    doc.setFillColor(...lightGreen);
    doc.circle(cardWidth / 2, 44, photoRadius, "F");
    
    if (data.photoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            const imgSize = photoRadius * 1.8;
            doc.addImage(img, "JPEG", cardWidth / 2 - imgSize/2, 44 - imgSize/2, imgSize, imgSize);
            resolve();
          };
          img.onerror = reject;
          img.src = data.photoUrl!;
        });
      } catch (e) {
        doc.setFillColor(150, 150, 150);
        doc.circle(cardWidth / 2, 42, 4, "F");
        doc.ellipse(cardWidth / 2, 49, 5, 3, "F");
      }
    } else {
      doc.setFillColor(150, 150, 150);
      doc.circle(cardWidth / 2, 42, 4, "F");
      doc.ellipse(cardWidth / 2, 49, 5, 3, "F");
    }

    doc.setTextColor(...teacherPrimary);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(data.teacherName.toUpperCase(), cardWidth / 2, 60, { align: "center" });
    
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayColor);
    doc.text(data.department || "Teaching Staff", cardWidth / 2, 64, { align: "center" });

    const details = [
      { label: "ID", value: data.employeeId },
      { label: "Phone", value: data.phone || "N/A" },
      { label: "Qual.", value: data.qualification || "N/A" },
    ];
    
    details.forEach((detail, index) => {
      const y = 68 + (index * 4);
      doc.setTextColor(...teacherPrimary);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5);
      doc.text(detail.label, 6, y);
      doc.setTextColor(...grayColor);
      doc.text(":", 15, y);
      doc.setTextColor(...darkColor);
      doc.setFont("helvetica", "normal");
      doc.text(detail.value, 18, y);
    });

    drawGreenWave(doc, cardWidth, cardHeight - 8, cardHeight);

    // Back side
    doc.addPage([cardWidth, cardHeight], "portrait");

    doc.setFillColor(...whiteColor);
    doc.rect(0, 0, cardWidth, cardHeight, "F");

    doc.setFillColor(...goldColor);
    doc.circle(cardWidth / 2, 7, 6, "F");
    doc.setFillColor(...whiteColor);
    doc.circle(cardWidth / 2, 7, 5, "F");
    
    if (logoImg) {
      doc.addImage(logoImg, "PNG", cardWidth / 2 - 4, 3, 8, 8);
    }

    doc.setTextColor(...teacherPrimary);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName, cardWidth / 2, 15, { align: "center" });
    
    doc.setFontSize(4);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...grayColor);
    doc.text(data.schoolAddress || "Madyan Swat, Pakistan", cardWidth / 2, 19, { align: "center" });

    doc.setDrawColor(...goldColor);
    doc.setLineWidth(0.4);
    doc.line(10, 22, cardWidth - 10, 22);

    doc.setTextColor(...teacherPrimary);
    doc.setFontSize(5);
    doc.setFont("helvetica", "bold");
    doc.text("Terms and Conditions", cardWidth / 2, 27, { align: "center" });
    
    doc.setFontSize(3.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    
    const terms = [
      "This card must be worn at all times on campus.",
      "Report loss immediately to the administration.",
      "This card is non-transferable.",
    ];
    
    terms.forEach((term, index) => {
      doc.text(term, cardWidth / 2, 32 + (index * 3.5), { align: "center" });
    });

    doc.setFontSize(4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...teacherPrimary);
    doc.text("Specialization:", 6, 46);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkColor);
    doc.text(data.specialization || "N/A", 6, 50);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...teacherPrimary);
    doc.text("Blood Group:", 6, 55);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkColor);
    doc.text(data.bloodGroup || "N/A", 26, 55);

    if (qrCodeImg) {
      const qrSize = 16;
      const qrX = cardWidth / 2 - qrSize / 2;
      doc.setFillColor(...lightGreen);
      doc.roundedRect(qrX - 2, 57, qrSize + 4, qrSize + 4, 3, 3, "F");
      doc.addImage(qrCodeImg, "PNG", qrX, 59, qrSize, qrSize);
    }

    doc.setFontSize(3.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`Joining: ${data.joiningDate || "01/01/25"}`, 6, cardHeight - 10);
    doc.text(`Valid till: ${data.validUntil || "12/12/26"}`, cardWidth - 6, cardHeight - 10, { align: "right" });

    drawGreenWave(doc, cardWidth, cardHeight - 6, cardHeight);
  }

  return doc;
};

export const downloadBulkTeacherCards = async (teachers: TeacherCardData[]) => {
  const doc = await generateBulkTeacherCards(teachers);
  doc.save(`TeacherCards-Bulk-${new Date().toISOString().split('T')[0]}.pdf`);
};