
# Admin Dashboard Restructure - Legacy VB6-Style Navigation

## Overview
This plan restructures the admin dashboard navigation from the current sidebar modules to match the legacy VB6 software behavior. The focus is on:
1. Keeping the sidebar navigation (not switching to menu bar)
2. Simplifying to core modules: Classes, Session, and Students
3. Implementing a multi-part student registration form matching the legacy workflow

## Current State Analysis
- Sidebar has: Dashboard, Students, Classes, Fees, Examinations, Certificates, Reports, Administrator
- Classes page exists but needs to support school sections (Main, J&G, Akhundabad)
- Session management exists in header via SessionSelector
- Student form is a single dialog, not a multi-part tabbed form

## Changes Required

### 1. Sidebar Navigation Update
**File: `src/components/admin/AdminLayout.tsx`**
- Keep only these items in sidebar:
  - Dashboard
  - Classes (existing)
  - Sessions (new - dedicated page for managing academic sessions)
  - Students (existing but will be redesigned)
  - Gallery (keep)
  - Timetable (keep)
  - Administrator (keep)

### 2. New Session Management Page
**File: `src/pages/admin/Sessions.tsx`** (new)
- Create academic sessions (e.g., "2026-27")
- Set current session
- View/edit session dates
- Simple CRUD interface matching legacy behavior

### 3. Enhanced Class & Section Management
**File: `src/pages/admin/Classes.tsx`** (modify)
- Add support for "School Sections" (Main, J&G, Akhundabad)
- Each class belongs to a school section
- Button to create/manage school sections
- Classes are just labels (no promotion logic, no academic-year dependency)

### 4. Database Changes Required
New tables/columns needed:
- `school_sections` table: id, name, description, created_at
- `houses` table: id, name, description, created_at (for student houses like IQBAL, QADEER)
- Add columns to `students` table:
  - `religion`
  - `nationality`
  - `blood_group`
  - `health_notes`
  - `house_id` (FK to houses)
  - `domicile`
  - `hostel_facility` (boolean)
  - `transport_facility` (boolean)
  - `admission_class_id` (class at time of admission)
  - `roll_number`
  - `previous_school_admission_no`
  - `school_leaving_number`
  - `school_leaving_date`
  - `created_by` (admin who created the record)

### 5. Redesigned Student Management - Multi-Part Form
**File: `src/pages/admin/StudentManagement.tsx`** (major rewrite)

The student form will have 4 tabs/parts:

**Part 1: Primary Data**
- Student ID (manual entry, show last used ID)
- Student Name
- Father Name
- Address
- Date of Birth
- Date of Admission
- Class of Admission
- Current Session
- Current Class
- Current Section (school section: Main, J&G, Akhundabad)
- Button to create/manage sections

**Part 2: Student Identity**
- Fingerprint setup placeholder (for biometric integration)
- Student Photo upload
- Religion
- Nationality
- Gender

**Part 3: Secondary Data Part 1**
- Father Occupation
- Father CNIC (used for parent login)
- Father Mobile Number
- Blood Group
- Health Notes
- House (IQBAL, QADEER, etc.)
- Button to add/manage houses

**Part 4: Secondary Data Part 2**
- Domicile (province/region)
- Hostel Facility (Yes/No)
- Transport Facility (Yes/No)
- Display current admin name (who is logged in)
- Radio buttons: New Student / From Previous School
- If Previous School selected:
  - Previous School Name
  - Previous School Admission Number
  - School Leaving Number
  - School Leaving Date

### 6. Houses Management
**File: `src/components/admin/HousesDialog.tsx`** (new)
- Dialog to add/edit/delete houses (IQBAL, QADEER, etc.)
- Triggered from Student form Part 3

### 7. School Sections Management
**File: `src/components/admin/SchoolSectionsDialog.tsx`** (new)
- Dialog to add/edit/delete school sections (Main, J&G, Akhundabad)
- Triggered from Classes page or Student form

## Implementation Phases

### Phase 1: Database Schema Updates
1. Create `school_sections` table with RLS
2. Create `houses` table with RLS
3. Add new columns to `students` table

### Phase 2: Sidebar & Navigation
1. Update AdminLayout.tsx sidebar items
2. Create Sessions.tsx page
3. Add route in App.tsx

### Phase 3: Classes Enhancement
1. Update Classes.tsx to include school section selection
2. Create SchoolSectionsDialog component

### Phase 4: Houses Management
1. Create HousesDialog component
2. Add house selection to student form

### Phase 5: Student Form Redesign
1. Refactor StudentManagement.tsx to use tabs
2. Implement all 4 parts of the form
3. Add "Last Student ID" display
4. Add current admin name display
5. Add previous school toggle logic

## Technical Considerations

### Sidebar Items (Final List)
```text
+------------------+
| Dashboard        |
+------------------+
| Students         |
+------------------+
| Classes          |
+------------------+
| Sessions         |
+------------------+
| Gallery          |
+------------------+
| Timetable        |
+------------------+
| Administrator    |
+------------------+
```

### Student Form Layout
```text
+-------------------------------------------+
| [ Primary Data ] [ Identity ] [ Secondary 1 ] [ Secondary 2 ] |
+-------------------------------------------+
|                                           |
|   Form fields for selected tab            |
|                                           |
+-------------------------------------------+
|              [ Save ] [ Cancel ]          |
+-------------------------------------------+
```

### Files to Create
- `src/pages/admin/Sessions.tsx` - Session management page
- `src/components/admin/SchoolSectionsDialog.tsx` - School sections CRUD
- `src/components/admin/HousesDialog.tsx` - Houses CRUD
- `src/components/admin/StudentFormTabs.tsx` - Multi-part student form

### Files to Modify
- `src/components/admin/AdminLayout.tsx` - Update sidebar
- `src/pages/admin/Classes.tsx` - Add school section support
- `src/pages/admin/StudentManagement.tsx` - Complete redesign
- `src/App.tsx` - Add Sessions route

### Database Migrations Needed
1. Create `school_sections` table
2. Create `houses` table
3. ALTER `students` table with new columns
4. Add foreign keys and RLS policies

## Core Behavior Rules (Preserved)
- Admin can freely navigate all modules
- No enforced academic lifecycle
- No required setup sequence
- Student-centric and fee-centric logic
- Saving a student immediately makes them available everywhere
- Soft delete (records deactivated, not removed)
