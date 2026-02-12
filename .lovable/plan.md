

## Plan: Fee Structure Setup, Fee Type Integration, and Custom Monthly Fee

### Overview
This plan covers four interconnected changes: (1) pre-populate the fee structure matrix with exact amounts from the reference image, (2) add a "Fee Structure" navigation button on the Fee Card page, (3) show all available fee types when a student is searched and allow one-click adding, and (4) create a "Customize Monthly Fee" feature for special students.

### Part 1: Pre-populate Fee Structure Data

Insert the exact fee amounts from the reference image into the `fee_type_structures` table for the current academic year (2025-26). This will be done via a database migration that first clears existing data for this session, then inserts all rows.

Fee types and their grade-wise amounts (from image):

| Fee Type | P.G | Nur | KG | 1st | 2nd | 3rd | 4th | 5th | 6th | 7th | 8th | 9th | 10th | 11th | 12th | 13th | 14th |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Annual | 41000 | 41000 | 41000 | 41000 | 41000 | 41000 | 41000 | 49000 | 49000 | 49000 | 49000 | 90000 | 96000 | 160000 | 166000 | 0 | 0 |
| Admission | 5000 | 5000 | 5000 | 5000 | 5000 | 5000 | 7000 | 7000 | 7000 | 7000 | 8000 | 8000 | 8000 | 10000 | 10000 | 0 | 0 |
| Tuition | 3000 | 3000 | 3000 | 3000 | 3000 | 3000 | 3000 | 3500 | 3500 | 3500 | 4500 | 4500 | 5000 | 8000 | 8500 | 0 | 0 |
| Exam | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 500 | 0 | 0 | 0 | 0 |
| Certificate Fee | 0 | 0 | 0 | 500 | 500 | 500 | 500 | 500 | 500 | 500 | 500 | 500 | 500 | 0 | 0 | 0 | 0 |
| Urgent Certificate Fee | 0 | 0 | 0 | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | 0 | 0 | 0 | 0 |
| Afternoon Classes | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3600 | 3600 | 3600 | 3600 | 4500 | 4500 | 0 | 0 | 0 |

All other fee types (Monthly-Test, Late-Fee, Hostal, Transport, Arrears, Medical Fee, Events Fee, Promotion Fee, Annual Practical Fee, Annual Stationery Fee, Annual Computer Fee, Circular Tests Fee, Dues, Combine Arrears) will be inserted with 0 amounts across all grades so they appear in the matrix for future editing.

### Part 2: Add "Fee Structure" Button on Fee Card Page

Add a navigation button on `StudentFeeCard.tsx` (the `/admin/fees` page) that takes the admin to the Fee Structure Matrix page (`/admin/fee-structure`). This will be placed in the header area alongside existing action buttons.

### Part 3: Show All Fee Types When Student Is Searched

Currently, when a student is selected, only fee types with non-zero amounts for that grade are shown in the left panel. The change will:

- Show ALL fee types from `fee_type_structures` (including zero-amount ones) as clickable items in the left panel
- Non-zero fee types will be shown with their amount badge
- Clicking a fee type that is not yet selected will toggle it on, adding it to the fee card
- This makes it easy to add any fee type to a student's card with one click

### Part 4: Customize Monthly Fee for Special Students

Create a new "Customize Fee" dialog accessible from the Fee Card page. This allows admins to:

- Override the standard monthly/annual amount for a specific student and fee type
- Store custom amounts in a new `student_custom_fees` table
- When building the fee matrix, check for custom overrides before falling back to the standard `fee_type_structures` amount

**New database table: `student_custom_fees`**

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| student_id | uuid | FK to students |
| fee_type_name | text | The fee type name |
| custom_monthly_amount | numeric | Custom monthly amount |
| academic_year_id | uuid | FK to academic_years |
| remarks | text | Optional note (e.g., "scholarship") |
| created_at | timestamp | Auto |
| updated_at | timestamp | Auto |

RLS: Admin-only for all operations.

The Fee Card page will show a "Customize Fee" button. When clicked, a dialog appears showing the student's current fee types with their standard amounts, and the admin can override any amount. The custom amount takes priority over the standard structure when calculating the fee card.

### Technical Details

**Files to create:**
- Database migration SQL for fee data insertion and `student_custom_fees` table

**Files to edit:**
- `src/pages/admin/StudentFeeCard.tsx`:
  - Add "Fee Structure" navigation button in header
  - Show all fee types (not just non-zero) in left panel with amount badges
  - Add "Customize Fee" button and dialog
  - Modify fee matrix calculation to check `student_custom_fees` first
  - Fetch custom fees when student is selected

**Database changes:**
1. DELETE + INSERT into `fee_type_structures` for academic year 2025-26 with all fee data from the image
2. CREATE TABLE `student_custom_fees` with RLS policies (admin-only)

