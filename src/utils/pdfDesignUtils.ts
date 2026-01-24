import jsPDF from "jspdf";

// Royal Blue theme colors matching school branding
export const primaryColor: [number, number, number] = [30, 100, 180];
export const goldColor: [number, number, number] = [180, 140, 50];
export const darkColor: [number, number, number] = [30, 30, 30];
export const grayColor: [number, number, number] = [100, 100, 100];
export const lightGray: [number, number, number] = [240, 240, 240];

/**
 * Load school logo as an Image object
 */
export const loadLogo = async (): Promise<HTMLImageElement | null> => {
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

/**
 * Add a subtle school logo watermark to the center of the page
 * @param doc - jsPDF document
 * @param opacity - Opacity value (default 0.06)
 */
export const addWatermark = async (doc: jsPDF, opacity: number = 0.06): Promise<void> => {
  try {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = reject;
      logoImg.src = "/images/school-logo.png";
    });
    
    const watermarkSize = Math.min(pageWidth, pageHeight) * 0.4;
    const x = (pageWidth - watermarkSize) / 2;
    const y = (pageHeight - watermarkSize) / 2;
    
    // Create a canvas for the watermark with reduced opacity
    const canvas = document.createElement('canvas');
    canvas.width = logoImg.width;
    canvas.height = logoImg.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.globalAlpha = opacity;
      ctx.drawImage(logoImg, 0, 0);
      const watermarkData = canvas.toDataURL('image/png');
      doc.addImage(watermarkData, 'PNG', x, y, watermarkSize, watermarkSize);
    }
  } catch (e) {
    // Continue without watermark if it fails
  }
};

/**
 * Add decorative circular elements to the PDF background
 * @param doc - jsPDF document
 * @param headerY - Y position where header ends (circles will be placed below/around this)
 */
export const addCircularDecorations = (doc: jsPDF, headerY: number = 45): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Semi-transparent white circles in header area (visible against primary color)
  // Using direct drawing without GState for compatibility
  doc.setFillColor(255, 255, 255);
  doc.circle(pageWidth - 25, 20, 35, 'F');
  doc.circle(pageWidth - 60, -10, 25, 'F');
  doc.circle(30, 35, 20, 'F');
};

/**
 * Draw a styled header with circular logo container and gold ring
 * @param doc - jsPDF document
 * @param logoImg - Preloaded logo image or null
 * @param title - Main document title
 * @param subtitle - Subtitle text (e.g., class/date info)
 * @param schoolName - School name to display
 * @param schoolAddress - School address to display
 * @param headerHeight - Height of the header (default 45)
 */
export const drawStyledHeader = (
  doc: jsPDF,
  logoImg: HTMLImageElement | null,
  title: string,
  subtitle: string,
  schoolName: string = "The Suffah Public School & College",
  schoolAddress: string = "Madyan Swat, Pakistan",
  headerHeight: number = 45
): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, headerHeight, "F");
  
  // Gold accent stripe
  doc.setFillColor(...goldColor);
  doc.rect(0, headerHeight, pageWidth, 3, "F");
  
  // Circular logo container with gold ring
  if (logoImg) {
    const logoSize = 32;
    const logoX = 14;
    const logoY = (headerHeight - logoSize) / 2 + 2;
    
    // Gold ring around logo
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(2);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 3);
    
    // White circle background
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 1, 'F');
    
    // Add logo
    doc.addImage(logoImg, "PNG", logoX, logoY, logoSize, logoSize);
  }
  
  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName, pageWidth / 2 + 12, 16, { align: "center" });
  
  // School address
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(schoolAddress, pageWidth / 2 + 12, 25, { align: "center" });
  
  // Title
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2 + 12, 35, { align: "center" });
  
  // Subtitle
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, pageWidth / 2 + 12, 43, { align: "center" });
  }
};

/**
 * Draw a styled footer with circular page number badge and school info
 * @param doc - jsPDF document
 * @param pageNumber - Current page number
 * @param totalPages - Total number of pages
 * @param schoolAddress - School address to display in footer
 */
export const drawStyledFooter = (
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  schoolAddress: string = "Madyan Swat, Pakistan"
): void => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Footer background line
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.5);
  doc.line(15, pageHeight - 18, pageWidth - 15, pageHeight - 18);
  
  // School address in footer (left aligned)
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text(schoolAddress, 15, pageHeight - 12);
  
  // Page number text (right side, simple text format)
  doc.setTextColor(...primaryColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - 15, pageHeight - 12, { align: "right" });
  
  // Generation date (centered at bottom)
  doc.setTextColor(...grayColor);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 6, { align: "center" });
};

/**
 * Apply watermark and decorations to all pages of a document
 * @param doc - jsPDF document
 */
export const applyDesignToAllPages = async (doc: jsPDF): Promise<void> => {
  const totalPages = doc.getNumberOfPages();
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    await addWatermark(doc);
    addCircularDecorations(doc);
    drawStyledFooter(doc, i, totalPages);
  }
};

/**
 * Format time from 24h to 12h format
 */
export const formatTime = (time: string): string => {
  if (!time) return "";
  try {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  } catch {
    return time;
  }
};
