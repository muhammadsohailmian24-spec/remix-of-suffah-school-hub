import jsPDF from "jspdf";
import QRCode from "qrcode";

// Modern color palette
const primaryBlue: [number, number, number] = [26, 54, 93]; // Dark navy blue
const accentBlue: [number, number, number] = [0, 120, 180]; // Teal blue
const goldColor: [number, number, number] = [200, 160, 60];
const darkColor: [number, number, number] = [40, 40, 40];
const whiteColor: [number, number, number] = [255, 255, 255];
const lightBlue: [number, number, number] = [230, 245, 255];

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

// Draw smooth curved wave
const drawCurvedWave = (doc: jsPDF, cardWidth: number, startY: number, endY: number) => {
  // Draw multiple curved layers for wave effect
  const colors: [number, number, number][] = [
    [0, 90, 140],
    [0, 110, 160],
    [0, 130, 180],
  ];
  
  colors.forEach((color, index) => {
    doc.setFillColor(...color);
    const yOffset = startY + (index * 3);
    
    // Create wave shape using bezier-like curves with small rectangles
    for (let x = 0; x <= cardWidth; x += 0.3) {
      const waveY = yOffset + Math.sin((x / cardWidth) * Math.PI * 1.5) * 4;
      doc.rect(x, waveY, 0.4, endY - waveY, "F");
    }
  });
};

export const generateStudentCardPdf = async (data: StudentCardData): Promise<jsPDF> => {
  // VERTICAL card: 54mm x 86mm (standard CR80 portrait)
  const cardWidth = 54;
  const cardHeight = 86;
  
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [cardWidth, cardHeight],
  });

  const logoImg = await loadLogo();
  const qrCodeImg = await generateQRCodeImage(data.studentId);
  const schoolName = data.schoolName || "The Suffah Public School & College";

  // ===== FRONT SIDE =====
  
  // White background
  doc.setFillColor(...whiteColor);
  doc.rect(0, 0, cardWidth, cardHeight, "F");
  
  // Dark blue header (curved bottom)
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, cardWidth, 28, "F");
  
  // Curved bottom of header
  doc.setFillColor(...primaryBlue);
  for (let x = 0; x <= cardWidth; x += 0.2) {
    const curveY = 28 + Math.sin((x / cardWidth) * Math.PI) * 4;
    doc.rect(x, 28, 0.3, curveY - 28 + 0.5, "F");
  }

  // Logo circle with golden border
  const logoRadius = 8;
  const logoCenterX = cardWidth / 2;
  const logoCenterY = 10;
  
  // Golden outer circle
  doc.setFillColor(...goldColor);
  doc.circle(logoCenterX, logoCenterY, logoRadius + 1.5, "F");
  
  // White inner circle
  doc.setFillColor(...whiteColor);
  doc.circle(logoCenterX, logoCenterY, logoRadius, "F");
  
  if (logoImg) {
    const logoSize = logoRadius * 1.6;
    doc.addImage(logoImg, "PNG", logoCenterX - logoSize/2, logoCenterY - logoSize/2, logoSize, logoSize);
  }
  
  // School name in header
  doc.setTextColor(...whiteColor);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName, cardWidth / 2, 22, { align: "center" });
  
  // Subtitle
  doc.setFontSize(4);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 220);
  doc.text("STUDENT IDENTITY CARD", cardWidth / 2, 26, { align: "center" });

  // Photo area - circular with golden border
  const photoRadius = 12;
  const photoCenterX = cardWidth / 2;
  const photoCenterY = 44;
  
  // Golden border circle
  doc.setFillColor(...goldColor);
  doc.circle(photoCenterX, photoCenterY, photoRadius + 1.5, "F");
  
  // White background circle
  doc.setFillColor(...lightBlue);
  doc.circle(photoCenterX, photoCenterY, photoRadius, "F");
  
  if (data.photoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          // Clip to circle by drawing image in circular area
          const imgSize = photoRadius * 1.8;
          doc.addImage(img, "JPEG", photoCenterX - imgSize/2, photoCenterY - imgSize/2, imgSize, imgSize);
          resolve();
        };
        img.onerror = reject;
        img.src = data.photoUrl!;
      });
    } catch (e) {
      // Default avatar
      doc.setFillColor(180, 180, 180);
      doc.circle(photoCenterX, photoCenterY - 2, 4, "F");
      doc.ellipse(photoCenterX, photoCenterY + 5, 5, 3, "F");
    }
  } else {
    doc.setFillColor(150, 150, 150);
    doc.circle(photoCenterX, photoCenterY - 2, 4, "F");
    doc.ellipse(photoCenterX, photoCenterY + 5, 5, 3, "F");
  }

  // Student name
  doc.setTextColor(...primaryBlue);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(data.studentName.toUpperCase(), cardWidth / 2, 60, { align: "center" });
  
  // Class
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const classText = `Class ${data.className}${data.section ? ` - ${data.section}` : ""}`;
  doc.text(classText, cardWidth / 2, 64, { align: "center" });

  // Details section with dots separator
  const detailStartY = 68;
  doc.setFontSize(5);
  
  const details = [
    { label: "ID", value: data.studentId },
    { label: "D.O.B", value: data.dateOfBirth || "N/A" },
    { label: "Phone", value: data.phone || "N/A" },
  ];
  
  details.forEach((detail, index) => {
    const y = detailStartY + (index * 4);
    
    // Label
    doc.setTextColor(...primaryBlue);
    doc.setFont("helvetica", "bold");
    doc.text(detail.label, 6, y);
    
    // Dots
    doc.setTextColor(150, 150, 150);
    doc.text(":", 16, y);
    
    // Value
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "normal");
    doc.text(detail.value, 19, y);
  });

  // Bottom wave
  drawCurvedWave(doc, cardWidth, cardHeight - 8, cardHeight);

  // ===== BACK SIDE =====
  doc.addPage([cardWidth, cardHeight], "portrait");

  // White background
  doc.setFillColor(...whiteColor);
  doc.rect(0, 0, cardWidth, cardHeight, "F");

  // Small logo at top with circle
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
  doc.setTextColor(...primaryBlue);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName, cardWidth / 2, 15, { align: "center" });
  
  // Address
  doc.setFontSize(4);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text(data.schoolAddress || "Madyan Swat, Pakistan", cardWidth / 2, 19, { align: "center" });

  // Golden divider line
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(0.4);
  doc.line(10, 22, cardWidth - 10, 22);

  // Terms section
  doc.setTextColor(...primaryBlue);
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.text("Terms and Conditions", cardWidth / 2, 27, { align: "center" });
  
  doc.setFontSize(3.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  
  const terms = [
    "Students are required to carry this card at all times.",
    "If the card is lost or damaged, a replacement",
    "fee will be charged according to regulations.",
  ];
  
  terms.forEach((term, index) => {
    doc.text(term, cardWidth / 2, 32 + (index * 3.5), { align: "center" });
  });

  // Parent info
  doc.setFontSize(4);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryBlue);
  doc.text("Father/Guardian:", 6, 46);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text(data.fatherName, 6, 50);
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryBlue);
  doc.text("Blood Group:", 6, 55);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text(data.bloodGroup || "N/A", 26, 55);

  // QR Code in circle-like rounded container
  if (qrCodeImg) {
    const qrSize = 16;
    const qrX = cardWidth / 2 - qrSize / 2;
    const qrY = 59;
    
    // Light background for QR
    doc.setFillColor(...lightBlue);
    doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 3, 3, "F");
    
    doc.addImage(qrCodeImg, "PNG", qrX, qrY, qrSize, qrSize);
  }

  // Issue/Expire dates at bottom
  doc.setFontSize(3.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Issue date: ${data.joinDate || "01/01/25"}`, 6, cardHeight - 10);
  doc.text(`Expire date: ${data.validUntil || "12/12/26"}`, cardWidth - 6, cardHeight - 10, { align: "right" });

  // Bottom wave
  drawCurvedWave(doc, cardWidth, cardHeight - 6, cardHeight);

  return doc;
};

export const downloadStudentCard = async (data: StudentCardData) => {
  const doc = await generateStudentCardPdf(data);
  doc.save(`StudentCard-${data.studentId}.pdf`);
};

export const generateBulkStudentCards = async (students: StudentCardData[]): Promise<jsPDF> => {
  const cardWidth = 54;
  const cardHeight = 86;
  
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
    doc.setFillColor(...whiteColor);
    doc.rect(0, 0, cardWidth, cardHeight, "F");
    
    // Header
    doc.setFillColor(...primaryBlue);
    doc.rect(0, 0, cardWidth, 28, "F");
    
    // Curved header bottom
    for (let x = 0; x <= cardWidth; x += 0.2) {
      const curveY = 28 + Math.sin((x / cardWidth) * Math.PI) * 4;
      doc.rect(x, 28, 0.3, curveY - 28 + 0.5, "F");
    }

    // Logo circle
    const logoRadius = 8;
    doc.setFillColor(...goldColor);
    doc.circle(cardWidth / 2, 10, logoRadius + 1.5, "F");
    doc.setFillColor(...whiteColor);
    doc.circle(cardWidth / 2, 10, logoRadius, "F");
    
    if (logoImg) {
      const logoSize = logoRadius * 1.6;
      doc.addImage(logoImg, "PNG", cardWidth / 2 - logoSize/2, 10 - logoSize/2, logoSize, logoSize);
    }
    
    // School name
    doc.setTextColor(...whiteColor);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName, cardWidth / 2, 22, { align: "center" });
    
    doc.setFontSize(4);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 200, 220);
    doc.text("STUDENT IDENTITY CARD", cardWidth / 2, 26, { align: "center" });

    // Photo circle
    const photoRadius = 12;
    doc.setFillColor(...goldColor);
    doc.circle(cardWidth / 2, 44, photoRadius + 1.5, "F");
    doc.setFillColor(...lightBlue);
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

    // Name
    doc.setTextColor(...primaryBlue);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(data.studentName.toUpperCase(), cardWidth / 2, 60, { align: "center" });
    
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const classText = `Class ${data.className}${data.section ? ` - ${data.section}` : ""}`;
    doc.text(classText, cardWidth / 2, 64, { align: "center" });

    // Details
    const details = [
      { label: "ID", value: data.studentId },
      { label: "D.O.B", value: data.dateOfBirth || "N/A" },
      { label: "Phone", value: data.phone || "N/A" },
    ];
    
    details.forEach((detail, index) => {
      const y = 68 + (index * 4);
      doc.setTextColor(...primaryBlue);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5);
      doc.text(detail.label, 6, y);
      doc.setTextColor(150, 150, 150);
      doc.text(":", 16, y);
      doc.setTextColor(...darkColor);
      doc.setFont("helvetica", "normal");
      doc.text(detail.value, 19, y);
    });

    drawCurvedWave(doc, cardWidth, cardHeight - 8, cardHeight);

    // ===== BACK SIDE =====
    doc.addPage([cardWidth, cardHeight], "portrait");

    doc.setFillColor(...whiteColor);
    doc.rect(0, 0, cardWidth, cardHeight, "F");

    // Back logo
    doc.setFillColor(...goldColor);
    doc.circle(cardWidth / 2, 7, 6, "F");
    doc.setFillColor(...whiteColor);
    doc.circle(cardWidth / 2, 7, 5, "F");
    
    if (logoImg) {
      doc.addImage(logoImg, "PNG", cardWidth / 2 - 4, 3, 8, 8);
    }

    doc.setTextColor(...primaryBlue);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName, cardWidth / 2, 15, { align: "center" });
    
    doc.setFontSize(4);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(data.schoolAddress || "Madyan Swat, Pakistan", cardWidth / 2, 19, { align: "center" });

    doc.setDrawColor(...goldColor);
    doc.setLineWidth(0.4);
    doc.line(10, 22, cardWidth - 10, 22);

    doc.setTextColor(...primaryBlue);
    doc.setFontSize(5);
    doc.setFont("helvetica", "bold");
    doc.text("Terms and Conditions", cardWidth / 2, 27, { align: "center" });
    
    doc.setFontSize(3.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    
    const terms = [
      "Students are required to carry this card at all times.",
      "If the card is lost or damaged, a replacement",
      "fee will be charged according to regulations.",
    ];
    
    terms.forEach((term, index) => {
      doc.text(term, cardWidth / 2, 32 + (index * 3.5), { align: "center" });
    });

    doc.setFontSize(4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryBlue);
    doc.text("Father/Guardian:", 6, 46);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkColor);
    doc.text(data.fatherName, 6, 50);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryBlue);
    doc.text("Blood Group:", 6, 55);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkColor);
    doc.text(data.bloodGroup || "N/A", 26, 55);

    if (qrCodeImg) {
      const qrSize = 16;
      const qrX = cardWidth / 2 - qrSize / 2;
      doc.setFillColor(...lightBlue);
      doc.roundedRect(qrX - 2, 57, qrSize + 4, qrSize + 4, 3, 3, "F");
      doc.addImage(qrCodeImg, "PNG", qrX, 59, qrSize, qrSize);
    }

    doc.setFontSize(3.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`Issue date: ${data.joinDate || "01/01/25"}`, 6, cardHeight - 10);
    doc.text(`Expire date: ${data.validUntil || "12/12/26"}`, cardWidth - 6, cardHeight - 10, { align: "right" });

    drawCurvedWave(doc, cardWidth, cardHeight - 6, cardHeight);
  }

  return doc;
};

export const downloadBulkStudentCards = async (students: StudentCardData[], className?: string) => {
  const doc = await generateBulkStudentCards(students);
  const filename = className ? `StudentCards-${className.replace(/\s+/g, "-")}` : "StudentCards";
  doc.save(`${filename}.pdf`);
};
