

# Student Documents Storage and Management

## Overview
Implement a complete document management system for students that allows admins to upload, store, preview, and download important documents such as birth certificates, father's CNIC copies, Form B, medical certificates, and more.

## Current State Analysis
- **Storage Buckets**: The project has `student-photos` bucket for photos but no dedicated bucket for documents
- **Students Table**: No column currently exists for storing document references
- **StudentFormTabs**: Has 4 tabs (Primary, Identity, Secondary 1, Secondary 2) - we can add a 5th "Documents" tab
- **AdmissionFormData**: Already has a `documents` interface with checkboxes for document types

## Implementation Plan

### 1. Database Changes

**Create a new `student_documents` table:**
- `id` (uuid, primary key)
- `student_id` (uuid, foreign key to students)
- `document_type` (text) - birth_certificate, father_cnic, form_b, medical_certificate, leaving_certificate, other
- `document_name` (text) - original filename
- `file_url` (text) - URL from storage bucket
- `uploaded_by` (uuid) - admin who uploaded
- `uploaded_at` (timestamp)
- `notes` (text, optional)

**RLS Policies:**
- Admins can perform all CRUD operations
- Students/Parents can view their own documents (read-only)

### 2. Storage Bucket

**Create `student-documents` bucket:**
- Private bucket (not public) for security
- Files organized by student ID: `{student_id}/{document_type}_{timestamp}.{ext}`
- Allow common document formats: PDF, JPG, PNG, JPEG

### 3. UI Components

**New Components to Create:**

1. **StudentDocumentsTab** (`src/components/admin/StudentDocumentsTab.tsx`)
   - Document upload interface with drag-and-drop
   - Document type selector (dropdown)
   - Optional notes field
   - Progress indicator during upload

2. **StudentDocumentsDialog** (`src/components/admin/StudentDocumentsDialog.tsx`)
   - View all documents for a student
   - Grid/list view of uploaded documents
   - Preview button (opens in new tab or modal)
   - Download button
   - Delete button with confirmation
   - Upload new document button

3. **DocumentPreviewModal** (can reuse existing DocumentPreviewDialog for PDFs)
   - For images: display in modal
   - For PDFs: use iframe or existing PDF preview

### 4. Integration Points

**StudentManagement.tsx:**
- Add "Documents" option in the student actions dropdown menu
- Opens StudentDocumentsDialog when clicked

**StudentFormTabs.tsx:**
- Add 5th tab "Documents" for new student registration
- Allow uploading documents during student creation

### 5. Document Types

Predefined document types:
- Birth Certificate (Original & Copy)
- Father's CNIC Copy
- Form B (Child Registration)
- Previous School Leaving Certificate
- Medical Certificate
- Passport Size Photos
- Character Certificate
- Other (with custom label)

### 6. File Flow

```text
+------------------+       +-------------------+       +------------------+
|   Admin Selects  | ----> |  Upload to        | ----> |  Store URL in    |
|   File & Type    |       |  student-documents|       |  student_documents|
+------------------+       |  bucket           |       |  table           |
                           +-------------------+       +------------------+
                                    |
                                    v
                           +-------------------+
                           |  Return success   |
                           |  with preview URL |
                           +-------------------+
```

### 7. Technical Details

**File Upload Logic:**
```typescript
const uploadDocument = async (file: File, studentId: string, docType: string) => {
  const fileExt = file.name.split('.').pop();
  const timestamp = Date.now();
  const filePath = `${studentId}/${docType}_${timestamp}.${fileExt}`;
  
  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('student-documents')
    .upload(filePath, file, { upsert: false });
  
  if (uploadError) throw uploadError;
  
  // Get signed URL for private bucket
  const { data } = await supabase.storage
    .from('student-documents')
    .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year validity
  
  // Save to database
  await supabase.from('student_documents').insert({
    student_id: studentId,
    document_type: docType,
    document_name: file.name,
    file_url: filePath, // Store path, generate signed URL on view
    uploaded_by: session.user.id,
  });
};
```

**Viewing Documents:**
- For private bucket, generate signed URLs on-demand when viewing/downloading
- URLs expire after a short period for security

## Files to Create

1. `src/components/admin/StudentDocumentsDialog.tsx` - Main document management dialog
2. `src/components/admin/StudentDocumentsTab.tsx` - Documents tab for student form

## Files to Modify

1. `src/pages/admin/StudentManagement.tsx` - Add Documents option to dropdown
2. `src/components/admin/StudentFormTabs.tsx` - Add Documents tab

## Database Migration

```sql
-- Create storage bucket for student documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-documents', 'student-documents', false);

-- Storage policies for student-documents bucket
CREATE POLICY "Admins can upload student documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-documents' AND
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can view student documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-documents' AND
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete student documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-documents' AND
  has_role(auth.uid(), 'admin')
);

-- Create student_documents table
CREATE TABLE public.student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "student_documents_admin" ON public.student_documents
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "student_documents_select_own" ON public.student_documents
FOR SELECT TO authenticated
USING (
  student_id IN (
    SELECT id FROM students WHERE user_id = auth.uid()
  )
);
```

## User Experience

1. **From Student List:**
   - Click dropdown menu on any student
   - Click "Manage Documents"
   - Opens dialog showing all documents with upload option

2. **During Student Registration:**
   - 5th tab "Documents" in the add student form
   - Upload documents while creating student
   - Can skip and add later

3. **Document Preview:**
   - Images open in modal with zoom controls
   - PDFs open in browser's PDF viewer or embedded iframe
   - Download button for all file types

