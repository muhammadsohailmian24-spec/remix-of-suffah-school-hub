
# Fee Structure Matrix Implementation Plan

## Overview
Implement a Fee Structure management page that displays a matrix/grid of fee types vs class grades (matching the legacy VB6 interface from your screenshot). Admins can set annual fees for each fee type and grade, with support for adding new fee types.

---

## Understanding Your Requirements

Based on the screenshot, the system includes:
- **Data Grid**: Rows = Fee Types (Annual, Admission, Tuition, etc.), Columns = Grades (P.G, Nur, KG, 1st through 12th, DIT, CIT)
- **Add New Fee Type Section**: Dropdown to select fee type + "Add New" button
- **Update Section**: Select Class + Fee Type + Enter Fee Amount + "Update Fee" button
- **Print Button**: Export the fee structure as a PDF

---

## Database Changes

### New Table: `fee_type_structures`

This table will store the fee matrix data (annual amounts per fee type per grade level):

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| fee_type_name | text | e.g., "Annual", "Tuition", "Admission" |
| grade_level | integer | -3 (PG) to 15 (Special) matching existing schema |
| annual_amount | numeric | Fee amount for that grade |
| academic_year_id | uuid | Links to academic_years table |
| created_at | timestamp | Auto-set |
| updated_at | timestamp | Auto-set |

**Unique constraint**: `(fee_type_name, grade_level, academic_year_id)` to prevent duplicates.

**RLS Policies**:
- Admin can manage all records
- Everyone can read (for fee calculations)

---

## Predefined Fee Types

Based on your screenshot, these fee types will be pre-configured:

1. Annual
2. Admission
3. Tuition
4. Exam
5. Monthly-Test
6. Late-Fee
7. Hostal (Hostel)
8. Transport
9. Arrears
10. Dues
11. Medical Fee
12. Events Fee
13. Promotion Fee
14. Certificate Fee
15. Urgent Certificate Fee
16. Annual Practical Fee
17. Annual Stationery Fee
18. Annual Computer Fee
19. Circular Tests Fee
20. Afternoon Classes
21. Combine Arrears

---

## Grade Level Mapping

Using the existing grade level system:

| Grade Level (ID) | Display Label |
|------------------|---------------|
| -3 | P.G (Playgroup) |
| -2 | Nur (Nursery) |
| -1 | KG |
| 1 | 1st |
| 2 | 2nd |
| 3 | 3rd |
| 4 | 4th |
| 5 | 5th |
| 6 | 6th |
| 7 | 7th |
| 8 | 8th |
| 9 | 9th |
| 10 | 10th |
| 11 | 11th |
| 12 | 12th |
| 13 | DIT |
| 14 | CIT |
| 15 | Special |

---

## User Interface Design

### Page Layout

```text
+------------------------------------------------------------+
| Fee Structure                                               |
| Manage fee amounts for each grade level                     |
+------------------------------------------------------------+
| [Academic Year: 2025-26 v]  [+ Add Fee Type]  [Print] [Save]|
+------------------------------------------------------------+
|                                                             |
|  +------+------+------+-----+-----+-----+ ... +-----+-----+ |
|  | S.No | Fee Type | P.G | Nur | KG | 1st | ... | 12th| DIT | |
|  +------+----------+-----+-----+----+-----+ ... +-----+-----+ |
|  |  1   | Annual   |41000|41000|41000|41000|...|166000| 0   | |
|  |  2   | Admission| 5000| 5000| 5000| 5000|...|10000 | 0   | |
|  |  3   | Tuition  | 3000| 3000| 3000| 3000|...| 8500 |4500 | |
|  |  4   | Exam     |  0  |  0  |  0  |  0  |...|  500 | 0   | |
|  | ...  | ...      | ... | ... | ... | ... |...|  ... | ... | |
|  +------+----------+-----+-----+----+-----+ ... +-----+-----+ |
|                                                             |
+------------------------------------------------------------+
| Update Section (collapsible)                                |
| [Class: _____v]  [Fee-Type: _____v]  [Fee: ______]          |
|                           [Update Fee]                       |
+------------------------------------------------------------+
```

### Key Features

1. **Scrollable Grid Table**: Horizontal scroll for many grade columns
2. **Editable Cells**: Click to edit any cell value
3. **Add Fee Type Dialog**: Add new custom fee types to the list
4. **Quick Update Panel**: Select class + fee type + enter amount to update
5. **Academic Year Selector**: Switch between years
6. **Save Button**: Persist all changes to database
7. **Print Button**: Export PDF matching legacy format

---

## Files to Create

### 1. `src/pages/admin/FeeStructureMatrix.tsx`
Main page component with:
- Academic year selector
- Data grid with fee types (rows) and grades (columns)
- Add Fee Type dialog
- Quick Update section
- Save and Print buttons

### 2. `src/utils/generateFeeStructurePdf.ts`
PDF generator matching the legacy orange-themed format:
- School header with logo
- Date
- Fee matrix table with all fee types and grades
- Footer

---

## Files to Modify

### 1. `src/App.tsx`
Add route: `/admin/fee-structure`

### 2. `src/pages/admin/FeeManagement.tsx`
Add navigation button to Fee Structure page in the header

### 3. Database Migration
Create `fee_type_structures` table with proper RLS policies

---

## Technical Implementation Details

### Component State Structure

```typescript
// Fee matrix data structure
interface FeeMatrixData {
  [feeTypeName: string]: {
    [gradeLevel: number]: number; // annual amount
  };
}

// Grade columns configuration
const GRADE_COLUMNS = [
  { level: -3, label: "P.G" },
  { level: -2, label: "Nur" },
  { level: -1, label: "KG" },
  { level: 1, label: "1st" },
  // ... through 12, DIT (13), CIT (14), Special (15)
];

// Default fee types
const DEFAULT_FEE_TYPES = [
  "Annual", "Admission", "Tuition", "Exam", 
  "Monthly-Test", "Late-Fee", "Hostal", "Transport", ...
];
```

### Data Flow

1. **Load**: Fetch all `fee_type_structures` for selected academic year
2. **Transform**: Convert to matrix format `{ feeTypeName: { gradeLevel: amount } }`
3. **Edit**: Update local state on cell changes
4. **Save**: Upsert changed records to database
5. **Print**: Generate PDF from current matrix data

### Quick Update Logic

When admin selects Class + Fee Type + enters Amount:
- Find the grade level of the selected class
- Update the matrix cell for that fee type and grade
- Mark as dirty for save

---

## PDF Export Design

The PDF will match the legacy orange-themed design:
- Orange header bar with school name and date
- "Fee Structure" title
- Matrix table with:
  - S.No column
  - Fee Type column
  - Grade columns (P.G through Special)
- Footer with page number

---

## Integration with Existing Fee System

The new fee structure matrix will:
1. Store default fee amounts per grade level
2. When assigning fees to students, the system can pull default amounts from this matrix based on student's grade
3. Monthly fee calculation: `annual_amount / 12` for monthly billing

---

## Implementation Order

1. **Database Migration**: Create `fee_type_structures` table
2. **Route Setup**: Add route in App.tsx
3. **Main Component**: Build FeeStructureMatrix.tsx with grid UI
4. **PDF Generator**: Create generateFeeStructurePdf.ts
5. **Navigation**: Add button in FeeManagement.tsx to access the new page
6. **Testing**: Verify save/load/print functionality

---

## Summary

This implementation creates a dedicated Fee Structure Matrix page that:
- Matches the legacy VB6 interface layout
- Supports all grade levels from Playgroup to Special Class
- Allows adding custom fee types
- Provides quick update functionality
- Exports to PDF for printing
- Integrates with the existing academic year system
