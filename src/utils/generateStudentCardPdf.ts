import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";

// Colors - Royal Blue and Gold theme (matching school branding)
const primaryColor: [number, number, number] = [30, 100, 180];
const goldColor: [number, number, number] = [180, 140, 50];
const darkColor: [number, number, number] = [30, 30, 30];
const whiteColor: [number, number, number] = [255, 255, 255];

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
  validUntil?: string;
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

const generateBarcodeImage = (studentId: string): string => {
  // Create a canvas element for the barcode
  const canvas = document.createElement("canvas");
  
  JsBarcode(canvas, studentId, {
    format: "CODE128",
    width: 2,
    height: 40,
    displayValue: true,
    fontSize: 12,
    textMargin: 2,
    margin: 5,
    background: "#ffffff",
    lineColor: "#000000",
  });
  
  return canvas.toDataURL("image/png");
};

export const generateStudentCardPdf = async (data: StudentCardData): Promise<jsPDF> => {
  // Card size: 85.6mm x 53.98mm (standard ID card size)
  const cardWidth = 85.6;
  const cardHeight = 53.98;
  
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [cardHeight, cardWidth],
  });

  const logoImg = await loadLogo();
  const schoolName = data.schoolName || "The Suffah Public School & College";
  const schoolAddress = data.schoolAddress || "Madyan Swat, Pakistan";

  // ===== FRONT SIDE =====
  
  // Background gradient effect (solid blue header)
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, cardWidth, 18, "F");
  
  // Gold accent line
  doc.setFillColor(...goldColor);
  doc.rect(0, 18, cardWidth, 1.5, "F");

  // Logo
  if (logoImg) {
    doc.addImage(logoImg, "PNG", 3, 2, 14, 14);
  }

  // School name in header
  doc.setTextColor(...whiteColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName, cardWidth / 2 + 5, 7, { align: "center" });
  
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text(schoolAddress, cardWidth / 2 + 5, 11, { align: "center" });
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("STUDENT IDENTITY CARD", cardWidth / 2 + 5, 15.5, { align: "center" });

  // Photo area
  const photoX = 5;
  const photoY = 22;
  const photoWidth = 20;
  const photoHeight = 25;
  
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.rect(photoX, photoY, photoWidth, photoHeight);
  
  if (data.photoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          doc.addImage(img, "JPEG", photoX, photoY, photoWidth, photoHeight);
          resolve();
        };
        img.onerror = reject;
        img.src = data.photoUrl!;
      });
    } catch (e) {
      doc.setFontSize(6);
      doc.setTextColor(...primaryColor);
      doc.text("Photo", photoX + photoWidth / 2, photoY + photoHeight / 2, { align: "center" });
    }
  } else {
    doc.setFontSize(6);
    doc.setTextColor(...primaryColor);
    doc.text("Photo", photoX + photoWidth / 2, photoY + photoHeight / 2, { align: "center" });
  }

  // Student details
  const detailsX = 28;
  let detailsY = 23;
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(data.studentName.toUpperCase(), detailsX, detailsY);
  
  detailsY += 5;
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  
  const details = [
    { label: "ID:", value: data.studentId },
    { label: "Father:", value: data.fatherName },
    { label: "Class:", value: `${data.className}${data.section ? ` - ${data.section}` : ""}` },
  ];

  if (data.bloodGroup) {
    details.push({ label: "Blood:", value: data.bloodGroup });
  }

  details.forEach((detail) => {
    doc.setFont("helvetica", "bold");
    doc.text(detail.label, detailsX, detailsY);
    doc.setFont("helvetica", "normal");
    doc.text(detail.value, detailsX + 12, detailsY);
    detailsY += 4;
  });

  // Barcode at bottom
  const barcodeDataUrl = generateBarcodeImage(data.studentId);
  doc.addImage(barcodeDataUrl, "PNG", cardWidth / 2 - 20, cardHeight - 14, 40, 12);

  // ===== BACK SIDE =====
  doc.addPage([cardHeight, cardWidth], "landscape");

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, cardWidth, 12, "F");
  
  doc.setFillColor(...goldColor);
  doc.rect(0, 12, cardWidth, 1, "F");

  if (logoImg) {
    doc.addImage(logoImg, "PNG", 3, 2, 8, 8);
  }

  doc.setTextColor(...whiteColor);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName, cardWidth / 2 + 3, 6, { align: "center" });
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.text(schoolAddress, cardWidth / 2 + 3, 10, { align: "center" });

  // Important instructions
  let backY = 17;
  doc.setTextColor(...darkColor);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("IMPORTANT INSTRUCTIONS:", 5, backY);
  
  backY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  
  const instructions = [
    "1. This card must be carried at all times within school premises.",
    "2. Loss of card should be reported immediately to the office.",
    "3. This card is non-transferable.",
    "4. Use barcode for attendance marking.",
  ];
  
  instructions.forEach((instruction) => {
    doc.text(instruction, 5, backY);
    backY += 3.5;
  });

  // Contact info
  backY += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.text("In case of emergency, please contact:", 5, backY);
  backY += 3;
  doc.setFont("helvetica", "normal");
  if (data.phone) {
    doc.text(`Student Phone: ${data.phone}`, 5, backY);
    backY += 3;
  }

  // Valid until
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(...primaryColor);
  const validText = `Valid Until: ${data.validUntil || "June 2026"}`;
  doc.text(validText, cardWidth / 2, cardHeight - 8, { align: "center" });

  // Footer
  doc.setFillColor(...goldColor);
  doc.rect(0, cardHeight - 4, cardWidth, 4, "F");
  doc.setTextColor(...darkColor);
  doc.setFontSize(5);
  doc.text("Scan barcode on front for attendance", cardWidth / 2, cardHeight - 1.5, { align: "center" });

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
    const schoolName = data.schoolName || "The Suffah Public School & College";
    const schoolAddress = data.schoolAddress || "Madyan Swat, Pakistan";

    // ===== FRONT SIDE =====
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, cardWidth, 18, "F");
    
    doc.setFillColor(...goldColor);
    doc.rect(0, 18, cardWidth, 1.5, "F");

    if (logoImg) {
      doc.addImage(logoImg, "PNG", 3, 2, 14, 14);
    }

    doc.setTextColor(...whiteColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName, cardWidth / 2 + 5, 7, { align: "center" });
    
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(schoolAddress, cardWidth / 2 + 5, 11, { align: "center" });
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("STUDENT IDENTITY CARD", cardWidth / 2 + 5, 15.5, { align: "center" });

    const photoX = 5;
    const photoY = 22;
    const photoWidth = 20;
    const photoHeight = 25;
    
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.rect(photoX, photoY, photoWidth, photoHeight);
    
    if (data.photoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            doc.addImage(img, "JPEG", photoX, photoY, photoWidth, photoHeight);
            resolve();
          };
          img.onerror = reject;
          img.src = data.photoUrl!;
        });
      } catch (e) {
        doc.setFontSize(6);
        doc.setTextColor(...primaryColor);
        doc.text("Photo", photoX + photoWidth / 2, photoY + photoHeight / 2, { align: "center" });
      }
    } else {
      doc.setFontSize(6);
      doc.setTextColor(...primaryColor);
      doc.text("Photo", photoX + photoWidth / 2, photoY + photoHeight / 2, { align: "center" });
    }

    const detailsX = 28;
    let detailsY = 23;
    
    doc.setTextColor(...darkColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(data.studentName.toUpperCase(), detailsX, detailsY);
    
    detailsY += 5;
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    
    const details = [
      { label: "ID:", value: data.studentId },
      { label: "Father:", value: data.fatherName },
      { label: "Class:", value: `${data.className}${data.section ? ` - ${data.section}` : ""}` },
    ];

    if (data.bloodGroup) {
      details.push({ label: "Blood:", value: data.bloodGroup });
    }

    details.forEach((detail) => {
      doc.setFont("helvetica", "bold");
      doc.text(detail.label, detailsX, detailsY);
      doc.setFont("helvetica", "normal");
      doc.text(detail.value, detailsX + 12, detailsY);
      detailsY += 4;
    });

    const barcodeDataUrl = generateBarcodeImage(data.studentId);
    doc.addImage(barcodeDataUrl, "PNG", cardWidth / 2 - 20, cardHeight - 14, 40, 12);

    // ===== BACK SIDE =====
    doc.addPage([cardHeight, cardWidth], "landscape");

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, cardWidth, 12, "F");
    
    doc.setFillColor(...goldColor);
    doc.rect(0, 12, cardWidth, 1, "F");

    if (logoImg) {
      doc.addImage(logoImg, "PNG", 3, 2, 8, 8);
    }

    doc.setTextColor(...whiteColor);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName, cardWidth / 2 + 3, 6, { align: "center" });
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.text(schoolAddress, cardWidth / 2 + 3, 10, { align: "center" });

    let backY = 17;
    doc.setTextColor(...darkColor);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text("IMPORTANT INSTRUCTIONS:", 5, backY);
    
    backY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    
    const instructions = [
      "1. This card must be carried at all times within school premises.",
      "2. Loss of card should be reported immediately to the office.",
      "3. This card is non-transferable.",
      "4. Use barcode for attendance marking.",
    ];
    
    instructions.forEach((instruction) => {
      doc.text(instruction, 5, backY);
      backY += 3.5;
    });

    backY += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    doc.text("In case of emergency, please contact:", 5, backY);
    backY += 3;
    doc.setFont("helvetica", "normal");
    if (data.phone) {
      doc.text(`Student Phone: ${data.phone}`, 5, backY);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...primaryColor);
    const validText = `Valid Until: ${data.validUntil || "June 2026"}`;
    doc.text(validText, cardWidth / 2, cardHeight - 8, { align: "center" });

    doc.setFillColor(...goldColor);
    doc.rect(0, cardHeight - 4, cardWidth, 4, "F");
    doc.setTextColor(...darkColor);
    doc.setFontSize(5);
    doc.text("Scan barcode on front for attendance", cardWidth / 2, cardHeight - 1.5, { align: "center" });
  }

  return doc;
};

export const downloadBulkStudentCards = async (students: StudentCardData[], className?: string) => {
  const doc = await generateBulkStudentCards(students);
  const filename = className ? `StudentCards-${className.replace(/\s+/g, "-")}` : "StudentCards";
  doc.save(`${filename}.pdf`);
};
