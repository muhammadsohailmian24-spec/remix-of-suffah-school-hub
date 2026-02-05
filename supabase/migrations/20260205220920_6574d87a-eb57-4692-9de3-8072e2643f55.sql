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

CREATE POLICY "Admins can update student documents"
ON storage.objects FOR UPDATE
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

-- Add trigger for updated_at
CREATE TRIGGER update_student_documents_updated_at
BEFORE UPDATE ON public.student_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();