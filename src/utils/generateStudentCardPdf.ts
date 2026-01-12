import jsPDF from "jspdf";
import QRCode from "qrcode";

// Modern color palette - matching the reference design
const primaryBlue: [number, number, number] = [26, 54, 93]; // Dark navy blue
const accentBlue: [number, number, number] = [30, 100, 180]; // Royal Blue
const goldColor: [number, number, number] = [180, 145, 60];
const darkColor: [number, number, number] = [40, 40, 40];
const whiteColor: [number, number, number] = [255, 255, 255];
const lightGray: [number, number, number] = [240, 240, 240];
const waveBlue: [number, number, number] = [0, 120, 180]; // Teal blue for wave

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
      width: 200,
      margin: 1,
      color: {
        dark: "#1A365D",
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

// Draw decorative wave at the bottom
const drawWave = (doc: jsPDF, cardWidth: number, cardHeight: number, yStart: number) => {
  // First wave (darker)
  doc.setFillColor(...waveBlue);
  doc.moveTo(0, yStart);
  
  // Create wave path using curves
  const waveHeight = 15;
  const curveWidth = cardWidth / 3;
  
  // Draw wave using bezier approximation with triangles
  for (let x = 0; x <= cardWidth; x += 0.5) {
    const y = yStart + Math.sin((x / cardWidth) * Math.PI * 2) * 3 + waveHeight / 2;
    if (x === 0) {
      doc.moveTo(x, y);
    }
  }
  
  // Simplified wave - gradient effect with overlapping shapes
  doc.setFillColor(0, 100, 160);
  doc.triangle(0, cardHeight - 18, cardWidth / 2, cardHeight - 25, cardWidth, cardHeight - 15, "F");
  
  doc.setFillColor(0, 130, 180);
  doc.triangle(0, cardHeight - 12, cardWidth / 2, cardHeight - 20, cardWidth, cardHeight - 10, "F");
  
  doc.setFillColor(0, 150, 200);
  doc.triangle(0, cardHeight - 8, cardWidth, cardHeight - 8, cardWidth, cardHeight, "F");
  doc.rect(0, cardHeight - 8, cardWidth, 8, "F");
};

export const generateStudentCardPdf = async (data: StudentCardData): Promise<jsPDF> => {
  // VERTICAL card size: 53.98mm x 85.6mm (standard ID card size - CR80 portrait)
  const cardWidth = 53.98;
  const cardHeight = 85.6;
  
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [cardWidth, cardHeight],
  });

  const logoImg = await loadLogo();
  const qrCodeImg = await generateQRCodeImage(data.studentId);
  const schoolName = data.schoolName || "The Suffah Public School & College";

  // ===== FRONT SIDE =====
  
  // Dark blue header section (top ~35%)
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, cardWidth, 32, "F");
  
  // White main section
  doc.setFillColor(...whiteColor);
  doc.rect(0, 32, cardWidth, cardHeight - 32, "F");

  // Logo in golden hexagon-like border (top center)
  const logoSize = 14;
  const logoX = cardWidth / 2 - logoSize / 2;
  const logoY = 3;
  
  // Golden border circle for logo
  doc.setFillColor(...goldColor);
  doc.circle(cardWidth / 2, logoY + logoSize / 2 + 1, logoSize / 2 + 2, "F");
  doc.setFillColor(...whiteColor);
  doc.circle(cardWidth / 2, logoY + logoSize / 2 + 1, logoSize / 2 + 0.5, "F");
  
  if (logoImg) {
    doc.addImage(logoImg, "PNG", logoX + 0.5, logoY + 1.5, logoSize - 1, logoSize - 1);
  }
  
  // School name
  doc.setTextColor(...whiteColor);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  const schoolNameLines = doc.splitTextToSize(schoolName, cardWidth - 8);
  doc.text(schoolNameLines, cardWidth / 2, 21, { align: "center" });
  
  // Subtitle
  doc.setFontSize(4.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text("STUDENT IDENTITY CARD", cardWidth / 2, 28, { align: "center" });

  // Photo area with golden border
  const photoSize = 22;
  const photoX = cardWidth / 2 - photoSize / 2;
  const photoY = 34;
  
  // Golden border
  doc.setFillColor(...goldColor);
  doc.roundedRect(photoX - 1.5, photoY - 1.5, photoSize + 3, photoSize + 3, 2, 2, "F");
  doc.setFillColor(...whiteColor);
  doc.roundedRect(photoX - 0.5, photoY - 0.5, photoSize + 1, photoSize + 1, 1.5, 1.5, "F");
  
  // Photo placeholder
  doc.setFillColor(...lightGray);
  doc.roundedRect(photoX, photoY, photoSize, photoSize, 1, 1, "F");
  
  if (data.photoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          doc.addImage(img, "JPEG", photoX + 0.3, photoY + 0.3, photoSize - 0.6, photoSize - 0.6);
          resolve();
        };
        img.onerror = reject;
        img.src = data.photoUrl!;
      });
    } catch (e) {
      // Show placeholder icon
      doc.setFillColor(200, 200, 200);
      doc.circle(photoX + photoSize / 2, photoY + photoSize / 2 - 2, 4, "F");
      doc.ellipse(photoX + photoSize / 2, photoY + photoSize - 2, 6, 4, "F");
    }
  } else {
    // Default user icon
    doc.setFillColor(180, 180, 180);
    doc.circle(photoX + photoSize / 2, photoY + photoSize / 2 - 2, 4, "F");
    doc.ellipse(photoX + photoSize / 2, photoY + photoSize - 2, 6, 4, "F");
  }

  // Student name - bold and prominent
  doc.setTextColor(...primaryBlue);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(data.studentName.toUpperCase(), cardWidth / 2, 61, { align: "center" });
  
  // Class/Position
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const classText = `Class ${data.className}${data.section ? ` - ${data.section}` : ""}`;
  doc.text(classText, cardWidth / 2, 65, { align: "center" });

  // Details section with labels
  let detailY = 70;
  const labelX = 5;
  const valueX = 20;
  
  doc.setFontSize(5.5);
  
  // ID
  doc.setTextColor(...primaryBlue);
  doc.setFont("helvetica", "bold");
  doc.text("ID", labelX, detailY);
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${data.studentId}`, valueX, detailY);
  
  // D.O.B
  detailY += 4;
  doc.setTextColor(...primaryBlue);
  doc.setFont("helvetica", "bold");
  doc.text("D.O.B", labelX, detailY);
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${data.dateOfBirth || "N/A"}`, valueX, detailY);
  
  // Phone
  detailY += 4;
  doc.setTextColor(...primaryBlue);
  doc.setFont("helvetica", "bold");
  doc.text("Phone", labelX, detailY);
  doc.setTextColor(...darkColor);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${data.phone || "N/A"}`, valueX, detailY);

  // Decorative wave at bottom
  drawWave(doc, cardWidth, cardHeight, cardHeight - 20);

  // ===== BACK SIDE =====
  doc.addPage([cardWidth, cardHeight], "portrait");

  // White background
  doc.setFillColor(...whiteColor);
  doc.rect(0, 0, cardWidth, cardHeight, "F");

  // Logo at top (smaller)
  const backLogoSize = 10;
  if (logoImg) {
    // Golden border
    doc.setFillColor(...goldColor);
    doc.circle(cardWidth / 2, 8, backLogoSize / 2 + 1.5, "F");
    doc.setFillColor(...whiteColor);
    doc.circle(cardWidth / 2, 8, backLogoSize / 2 + 0.3, "F");
    doc.addImage(logoImg, "PNG", cardWidth / 2 - backLogoSize / 2 + 0.5, 3.5, backLogoSize - 1, backLogoSize - 1);
  }

  // School name
  doc.setTextColor(...primaryBlue);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName, cardWidth / 2, 17, { align: "center" });
  
  // Tagline/Address
  doc.setFontSize(4);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text(data.schoolAddress || "Madyan Swat, Pakistan", cardWidth / 2, 21, { align: "center" });

  // Divider
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(0.3);
  doc.line(8, 24, cardWidth - 8, 24);

  // Terms and conditions section
  doc.setTextColor(...primaryBlue);
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.text("Terms and Conditions", cardWidth / 2, 28, { align: "center" });
  
  doc.setFontSize(4);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  
  const terms = [
    "Students are required to carry this card at all times.",
    "If the card is lost or damaged, a replacement",
    "fee will be charged according to regulations.",
    "",
    `Father/Guardian: ${data.fatherName}`,
    `Blood Group: ${data.bloodGroup || "N/A"}`,
  ];
  
  let termY = 33;
  terms.forEach(term => {
    doc.text(term, cardWidth / 2, termY, { align: "center" });
    termY += 3.5;
  });

  // QR Code section
  if (qrCodeImg) {
    doc.addImage(qrCodeImg, "PNG", cardWidth / 2 - 10, 52, 20, 20);
    doc.setFontSize(3.5);
    doc.setTextColor(100, 100, 100);
    doc.text("Scan for Attendance", cardWidth / 2, 74, { align: "center" });
  }

  // Issue and Expire dates at bottom
  const dateY = cardHeight - 10;
  doc.setFontSize(4);
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  doc.text(`Issue date: ${data.joinDate || "01/01/25"}`, 8, dateY);
  doc.text(`Expire date: ${data.validUntil || "12/12/26"}`, cardWidth - 8, dateY, { align: "right" });

  // Bottom wave
  drawWave(doc, cardWidth, cardHeight, cardHeight - 18);

  return doc;
};

export const downloadStudentCard = async (data: StudentCardData) => {
  const doc = await generateStudentCardPdf(data);
  doc.save(`StudentCard-${data.studentId}.pdf`);
};

export const generateBulkStudentCards = async (students: StudentCardData[]): Promise<jsPDF> => {
  const cardWidth = 53.98;
  const cardHeight = 85.6;
  
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [cardWidth, cardHeight],
  });

  const logoImg = await loadLogo();

  for (let i = 0; i < students.length; i++) {
    if (i > 0) {
      doc.addPage([cardWidth, cardHeight], "portrait");
    }

    const data = students[i];
    const qrCodeImg = await generateQRCodeImage(data.studentId);
    const schoolName = data.schoolName || "The Suffah Public School & College";

    // ===== FRONT SIDE =====
    
    // Dark blue header section
    doc.setFillColor(...primaryBlue);
    doc.rect(0, 0, cardWidth, 32, "F");
    
    // White main section
    doc.setFillColor(...whiteColor);
    doc.rect(0, 32, cardWidth, cardHeight - 32, "F");

    // Logo
    const logoSize = 14;
    const logoX = cardWidth / 2 - logoSize / 2;
    const logoY = 3;
    
    doc.setFillColor(...goldColor);
    doc.circle(cardWidth / 2, logoY + logoSize / 2 + 1, logoSize / 2 + 2, "F");
    doc.setFillColor(...whiteColor);
    doc.circle(cardWidth / 2, logoY + logoSize / 2 + 1, logoSize / 2 + 0.5, "F");
    
    if (logoImg) {
      doc.addImage(logoImg, "PNG", logoX + 0.5, logoY + 1.5, logoSize - 1, logoSize - 1);
    }
    
    // School name
    doc.setTextColor(...whiteColor);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    const schoolNameLines = doc.splitTextToSize(schoolName, cardWidth - 8);
    doc.text(schoolNameLines, cardWidth / 2, 21, { align: "center" });
    
    // Subtitle
    doc.setFontSize(4.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    doc.text("STUDENT IDENTITY CARD", cardWidth / 2, 28, { align: "center" });

    // Photo
    const photoSize = 22;
    const photoX = cardWidth / 2 - photoSize / 2;
    const photoY = 34;
    
    doc.setFillColor(...goldColor);
    doc.roundedRect(photoX - 1.5, photoY - 1.5, photoSize + 3, photoSize + 3, 2, 2, "F");
    doc.setFillColor(...whiteColor);
    doc.roundedRect(photoX - 0.5, photoY - 0.5, photoSize + 1, photoSize + 1, 1.5, 1.5, "F");
    
    doc.setFillColor(...lightGray);
    doc.roundedRect(photoX, photoY, photoSize, photoSize, 1, 1, "F");
    
    if (data.photoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            doc.addImage(img, "JPEG", photoX + 0.3, photoY + 0.3, photoSize - 0.6, photoSize - 0.6);
            resolve();
          };
          img.onerror = reject;
          img.src = data.photoUrl!;
        });
      } catch (e) {
        doc.setFillColor(180, 180, 180);
        doc.circle(photoX + photoSize / 2, photoY + photoSize / 2 - 2, 4, "F");
        doc.ellipse(photoX + photoSize / 2, photoY + photoSize - 2, 6, 4, "F");
      }
    } else {
      doc.setFillColor(180, 180, 180);
      doc.circle(photoX + photoSize / 2, photoY + photoSize / 2 - 2, 4, "F");
      doc.ellipse(photoX + photoSize / 2, photoY + photoSize - 2, 6, 4, "F");
    }

    // Student name
    doc.setTextColor(...primaryBlue);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(data.studentName.toUpperCase(), cardWidth / 2, 61, { align: "center" });
    
    // Class
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const classText = `Class ${data.className}${data.section ? ` - ${data.section}` : ""}`;
    doc.text(classText, cardWidth / 2, 65, { align: "center" });

    // Details
    let detailY = 70;
    const labelX = 5;
    const valueX = 20;
    
    doc.setFontSize(5.5);
    
    doc.setTextColor(...primaryBlue);
    doc.setFont("helvetica", "bold");
    doc.text("ID", labelX, detailY);
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${data.studentId}`, valueX, detailY);
    
    detailY += 4;
    doc.setTextColor(...primaryBlue);
    doc.setFont("helvetica", "bold");
    doc.text("D.O.B", labelX, detailY);
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${data.dateOfBirth || "N/A"}`, valueX, detailY);
    
    detailY += 4;
    doc.setTextColor(...primaryBlue);
    doc.setFont("helvetica", "bold");
    doc.text("Phone", labelX, detailY);
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${data.phone || "N/A"}`, valueX, detailY);

    // Wave
    drawWave(doc, cardWidth, cardHeight, cardHeight - 20);

    // ===== BACK SIDE =====
    doc.addPage([cardWidth, cardHeight], "portrait");

    doc.setFillColor(...whiteColor);
    doc.rect(0, 0, cardWidth, cardHeight, "F");

    const backLogoSize = 10;
    if (logoImg) {
      doc.setFillColor(...goldColor);
      doc.circle(cardWidth / 2, 8, backLogoSize / 2 + 1.5, "F");
      doc.setFillColor(...whiteColor);
      doc.circle(cardWidth / 2, 8, backLogoSize / 2 + 0.3, "F");
      doc.addImage(logoImg, "PNG", cardWidth / 2 - backLogoSize / 2 + 0.5, 3.5, backLogoSize - 1, backLogoSize - 1);
    }

    doc.setTextColor(...primaryBlue);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName, cardWidth / 2, 17, { align: "center" });
    
    doc.setFontSize(4);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(data.schoolAddress || "Madyan Swat, Pakistan", cardWidth / 2, 21, { align: "center" });

    doc.setDrawColor(...goldColor);
    doc.setLineWidth(0.3);
    doc.line(8, 24, cardWidth - 8, 24);

    doc.setTextColor(...primaryBlue);
    doc.setFontSize(5);
    doc.setFont("helvetica", "bold");
    doc.text("Terms and Conditions", cardWidth / 2, 28, { align: "center" });
    
    doc.setFontSize(4);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    
    const terms = [
      "Students are required to carry this card at all times.",
      "If the card is lost or damaged, a replacement",
      "fee will be charged according to regulations.",
      "",
      `Father/Guardian: ${data.fatherName}`,
      `Blood Group: ${data.bloodGroup || "N/A"}`,
    ];
    
    let termY = 33;
    terms.forEach(term => {
      doc.text(term, cardWidth / 2, termY, { align: "center" });
      termY += 3.5;
    });

    if (qrCodeImg) {
      doc.addImage(qrCodeImg, "PNG", cardWidth / 2 - 10, 52, 20, 20);
      doc.setFontSize(3.5);
      doc.setTextColor(100, 100, 100);
      doc.text("Scan for Attendance", cardWidth / 2, 74, { align: "center" });
    }

    const dateY = cardHeight - 10;
    doc.setFontSize(4);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    doc.text(`Issue date: ${data.joinDate || "01/01/25"}`, 8, dateY);
    doc.text(`Expire date: ${data.validUntil || "12/12/26"}`, cardWidth - 8, dateY, { align: "right" });

    drawWave(doc, cardWidth, cardHeight, cardHeight - 18);
  }

  return doc;
};

export const downloadBulkStudentCards = async (students: StudentCardData[], className?: string) => {
  const doc = await generateBulkStudentCards(students);
  const filename = className ? `StudentCards-${className.replace(/\s+/g, "-")}` : "StudentCards";
  doc.save(`${filename}.pdf`);
};
