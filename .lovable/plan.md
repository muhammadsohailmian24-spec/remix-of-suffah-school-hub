Fee Card Implementation – Legacy-Accurate Final Plan

This plan matches the old fee card system behavior, logic, and mental model shown in the screenshots and video.

Core Legacy Rules (DO NOT VIOLATE)

Fee structures define amounts

Fee cards define application (months, arrears)

Payments affect balance only

Balance controls printing

Months are visual, not authoritative

Advance payment does NOT mark future months as paid

“Don’t print free students” checkbox is final authority

Problems Identified (Confirmed)
Problem 1: Wrong Fee Source

student_fees may be empty (legacy allows this)

Fees must come from fee_type_structures

Fee depends on grade_level, not student records

Problem 2: Balance Incorrectly Zero

Zero balance occurs because no fee structure was loaded

This blocks:

Receiving payments

Printing fee cards

Problem 3: PDF Visual Bugs

White circles ❌

Missing watermark ❌

“Annual” terminology ❌ (legacy is monthly-centric)

Problem 4: Month Grid Logic Is Wrong

Months are auto-filled structurally ❌

Advance payments mark future months ❌

Grid ignores fee-card lifecycle ❌

✅ Correct Solution Architecture (Legacy Model)
Correct Data Flow
1. Select Student
     ↓
2. Resolve class → grade_level
     ↓
3. Fetch fee_type_structures for that grade
     ↓
4. User selects fee type(s)
     ↓
5. Fee Card Generation decides:
     - applicable month
     - arrears
     - whether grid exists
     ↓
6. Payments only affect:
     - paid amount
     - balance
     ↓
7. Balance + checkbox decide printing

🔧 File Changes Required
1️⃣ StudentFeeCard.tsx
Fetch Fee Structures (UNCHANGED – already correct)
const fetchStudentFeeData = async (studentId: string) => {
  const student = students.find(s => s.id === studentId);
  if (!student?.class?.grade_level) return;

  const { data: feeStructures } = await supabase
    .from("fee_type_structures")
    .select("*")
    .eq("grade_level", student.class.grade_level)
    .eq("academic_year_id", currentSession?.id);

  const { data: payments } = await supabase
    .from("fee_payments")
    .select("*")
    .eq("student_id", studentId);

  setFeeTypeStructures(feeStructures || []);
  setPayments(payments || []);
};

🔴 FIX 1: Fee Matrix Must Be Fee-Card–Driven (NOT structural)
❌ REMOVE this (legacy violation)
MONTHS_ACADEMIC.forEach(month => {
  monthData[month] = monthlyAmount;
});

✅ Correct Fee Matrix (Legacy-Accurate)
const feeMatrix = useMemo(() => {
  return selectedFeeTypes.map(feeType => {
    const feeStructure = feeTypeStructures.find(
      f => f.fee_type_name === feeType
    );

    const annualAmount = feeStructure?.annual_amount || 0;
    const monthlyAmount = Math.round(annualAmount / 12);

    // IMPORTANT: months are NOT prefilled
    const monthData: Record<string, number> = {};

    return {
      feeType,
      annualAmount,
      monthlyAmount,
      months: monthData, // populated only during fee card generation
    };
  });
}, [selectedFeeTypes, feeTypeStructures]);


✔ This ensures:

Checking a fee type ≠ charging all 12 months

Grid only activates when fee card exists

🔴 FIX 2: Advance Payment Logic (NO future paid months)
❌ REMOVE
const paidMonths = MONTHS_ACADEMIC.slice(0, monthsPaidCount);

✅ Correct Legacy Model
const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
const balance = Math.max(0, netTotal - totalPaid);

// NO future months tracked
const paidMonths: string[] = [];


✔ Legacy system tracks:

Paid amount

Balance

Arrears
❌ NOT individual future months

Totals Calculation (UNCHANGED, but clarified)
const totals = useMemo(() => {
  const totalAnnual = feeMatrix.reduce(
    (sum, row) => sum + row.annualAmount,
    0
  );

  const netTotal = totalAnnual - discount;
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.max(0, netTotal - paid);

  return { total: totalAnnual, discount, netTotal, paid, balance };
}, [feeMatrix, payments, discount]);

🔴 FIX 3: Printing Logic (Checkbox is FINAL authority)
❌ WRONG
if (balance === 0) skipPrinting();

✅ CORRECT (Legacy-Accurate)
if (balance === 0 && dontPrintFreeStudents) {
  skipPrinting();
}


✔ Free students can still be printed if checkbox is OFF
✔ Checkbox always wins

2️⃣ buildFeeCardData (Corrected)
const buildFeeCardData = (): FeeCardData | null => {
  if (!selectedStudent || selectedFeeTypes.length === 0) return null;

  const feeRow = feeMatrix[0];
  if (!feeRow) return null;

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.max(0, totals.netTotal - totalPaid);

  return {
    studentId: selectedStudent.student_id,
    studentName: selectedProfile.full_name,
    fatherName: selectedStudent.father_name || "N/A",
    className: selectedStudent.class?.name || "N/A",
    section: selectedStudent.class?.section,
    session: currentSession?.name || "2025–26",
    feeType: feeRow.feeType,
    monthlyAmount: feeRow.monthlyAmount,
    totalPaid,
    balance,
    dueDate: new Date(dueDate).toLocaleDateString(),
    feeOfMonth: selectedMonth, // fee card decides month
  };
};


✔ No paidMonths
✔ Balance-driven
✔ Fee-card-centric

3️⃣ generateFeeCardPdf.ts
Remove White Circles
// DELETE drawWhiteCircles()
// DELETE its call

Add Watermark
await addWatermark(doc, 0.06);

Update FeeCardData Interface
export interface FeeCardData {
  studentId: string;
  studentName: string;
  fatherName: string;
  className: string;
  section?: string;
  session: string;
  feeType: string;
  monthlyAmount: number;
  totalPaid: number;
  balance: number;
  dueDate: string;
  feeOfMonth: string;
}

Grid Rendering (Legacy Logic)

Grid exists only if fee card exists

Months shown:

selected month

arrears months

If balance = 0 → no grid

if (data.balance === 0) return; // legacy behavior


✔ Advance payment → no grid
✔ No fake paid months
✔ Arrears carry visually