import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  loadLogo,
  drawStyledHeader,
  drawStyledFooter,
  addWatermark,
  primaryColor,
  goldColor,
  darkColor,
  grayColor,
} from "./pdfDesignUtils";

// Grade level configuration
const GRADE_COLUMNS = [
  { level: -3, label: "P.G" },
  { level: -2, label: "Nur" },
  { level: -1, label: "KG" },
  { level: 1, label: "1st" },
  { level: 2, label: "2nd" },
  { level: 3, label: "3rd" },
  { level: 4, label: "4th" },
  { level: 5, label: "5th" },
  { level: 6, label: "6th" },
  { level: 7, label: "7th" },
  { level: 8, label: "8th" },
  { level: 9, label: "9th" },
  { level: 10, label: "10th" },
  { level: 11, label: "11th" },
  { level: 12, label: "12th" },
  { level: 13, label: "DIT" },
  { level: 14, label: "CIT" },
  { level: 15, label: "Special" },
];

interface FeeMatrixData {
  [feeTypeName: string]: {
    [gradeLevel: number]: number;
  };
}

export const generateFeeStructurePdf = async (
  feeTypes: string[],
  matrixData: FeeMatrixData,
  academicYear: string
): Promise<jsPDF> => {
  // Use landscape orientation for the wide matrix
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Load logo
  const logoImg = await loadLogo();

  // Add watermark
  await addWatermark(doc, 0.04);

  // Draw header
  drawStyledHeader(
    doc,
    logoImg,
    "Fee Structure",
    academicYear ? `Academic Year: ${academicYear}` : `Date: ${new Date().toLocaleDateString()}`,
    "The Suffah Public School & College",
    "Madyan Swat, Pakistan",
    40
  );

  // Prepare table data
  const tableHeaders = ["S.No", "Fee Type", ...GRADE_COLUMNS.map(g => g.label)];
  
  const tableData = feeTypes.map((feeType, index) => {
    const row: (string | number)[] = [
      index + 1,
      feeType,
      ...GRADE_COLUMNS.map(grade => {
        const amount = matrixData[feeType]?.[grade.level] || 0;
        return amount > 0 ? amount.toLocaleString() : "0";
      })
    ];
    return row;
  });

  // Generate table
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: 48,
    margin: { left: 5, right: 5 },
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      overflow: "linebreak",
      halign: "center",
      valign: "middle",
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [245, 248, 255],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" }, // S.No
      1: { cellWidth: 35, halign: "left" }, // Fee Type
    },
    didDrawPage: (data) => {
      // Add footer to each page
      const totalPages = doc.getNumberOfPages();
      drawStyledFooter(doc, doc.getCurrentPageInfo().pageNumber, totalPages);
    },
  });

  return doc;
};

export const downloadFeeStructurePdf = async (
  feeTypes: string[],
  matrixData: FeeMatrixData,
  academicYear: string
): Promise<void> => {
  const doc = await generateFeeStructurePdf(feeTypes, matrixData, academicYear);
  const filename = `Fee_Structure_${academicYear.replace(/\s+/g, "_") || new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
};

export const printFeeStructurePdf = async (
  feeTypes: string[],
  matrixData: FeeMatrixData,
  academicYear: string
): Promise<void> => {
  const doc = await generateFeeStructurePdf(feeTypes, matrixData, academicYear);
  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(pdfUrl, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};
