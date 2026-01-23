
-- =====================================================
-- PHASE 1: DATABASE CHANGES FOR ADMIN DASHBOARD REDESIGN
-- =====================================================

-- 1. EXPENSE HEADS TABLE (for categorizing expenses)
CREATE TABLE public.expense_heads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. EXPENSES TABLE (simple ledger)
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_head_id UUID NOT NULL REFERENCES public.expense_heads(id),
  amount NUMERIC NOT NULL,
  description TEXT,
  receipt_number TEXT,
  paid_to TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. FAMILIES TABLE (for consolidated billing)
CREATE TABLE public.families (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_code TEXT NOT NULL UNIQUE,
  primary_parent_id UUID REFERENCES public.parents(id),
  billing_address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. STUDENT_FAMILIES TABLE (link students to families)
CREATE TABLE public.student_families (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, family_id)
);

-- 5. SCHOOL LEAVING CERTIFICATES TABLE
CREATE TABLE public.school_leaving_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id),
  certificate_number TEXT NOT NULL UNIQUE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  leaving_date DATE NOT NULL,
  reason TEXT NOT NULL,
  conduct TEXT DEFAULT 'Good',
  character_remarks TEXT DEFAULT 'Good',
  last_class_attended TEXT,
  last_exam_passed TEXT,
  remarks TEXT,
  issued_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. FINGERPRINT TEMPLATES TABLE (for biometric integration)
CREATE TABLE public.fingerprint_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  template_data TEXT NOT NULL,
  finger_index INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, finger_index)
);

-- 7. GRADING SCHEMES TABLE
CREATE TABLE public.grading_schemes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  min_percentage NUMERIC NOT NULL,
  max_percentage NUMERIC NOT NULL,
  grade TEXT NOT NULL,
  grade_point NUMERIC,
  remarks TEXT,
  is_default BOOLEAN DEFAULT false,
  academic_year_id UUID REFERENCES public.academic_years(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- MODIFY EXISTING TABLES
-- =====================================================

-- Add GR Number to students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gr_number TEXT;

-- Add mark_source to attendance
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS mark_source TEXT DEFAULT 'manual';

-- Add position fields to results
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS position_in_class INTEGER;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS position_in_section INTEGER;
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS position_in_school INTEGER;

-- Add off-time receipt flag to fee_payments
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS is_offtime_receipt BOOLEAN DEFAULT false;

-- =====================================================
-- ENABLE RLS ON NEW TABLES
-- =====================================================

ALTER TABLE public.expense_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_leaving_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fingerprint_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_schemes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR NEW TABLES
-- =====================================================

-- EXPENSE_HEADS policies
CREATE POLICY "expense_heads_admin" ON public.expense_heads
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "expense_heads_select" ON public.expense_heads
  FOR SELECT USING (true);

-- EXPENSES policies
CREATE POLICY "expenses_admin" ON public.expenses
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));

-- FAMILIES policies
CREATE POLICY "families_admin" ON public.families
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "families_select" ON public.families
  FOR SELECT USING (true);

-- STUDENT_FAMILIES policies
CREATE POLICY "student_families_admin" ON public.student_families
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "student_families_select" ON public.student_families
  FOR SELECT USING (true);

-- SCHOOL_LEAVING_CERTIFICATES policies
CREATE POLICY "slc_admin" ON public.school_leaving_certificates
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "slc_select_own" ON public.school_leaving_certificates
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- FINGERPRINT_TEMPLATES policies
CREATE POLICY "fingerprint_admin" ON public.fingerprint_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

-- GRADING_SCHEMES policies
CREATE POLICY "grading_schemes_admin" ON public.grading_schemes
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "grading_schemes_select" ON public.grading_schemes
  FOR SELECT USING (true);

-- =====================================================
-- TRIGGERS FOR updated_at
-- =====================================================

CREATE TRIGGER update_expense_heads_updated_at
  BEFORE UPDATE ON public.expense_heads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_families_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_slc_updated_at
  BEFORE UPDATE ON public.school_leaving_certificates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fingerprint_updated_at
  BEFORE UPDATE ON public.fingerprint_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grading_schemes_updated_at
  BEFORE UPDATE ON public.grading_schemes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SEED DEFAULT GRADING SCHEME
-- =====================================================

INSERT INTO public.grading_schemes (name, min_percentage, max_percentage, grade, grade_point, remarks, is_default)
VALUES 
  ('A+', 90, 100, 'A+', 4.0, 'Outstanding', true),
  ('A', 80, 89.99, 'A', 3.7, 'Excellent', true),
  ('B+', 70, 79.99, 'B+', 3.3, 'Very Good', true),
  ('B', 60, 69.99, 'B', 3.0, 'Good', true),
  ('C+', 50, 59.99, 'C+', 2.5, 'Satisfactory', true),
  ('C', 40, 49.99, 'C', 2.0, 'Pass', true),
  ('F', 0, 39.99, 'F', 0.0, 'Fail', true);

-- =====================================================
-- SEED DEFAULT EXPENSE HEADS
-- =====================================================

INSERT INTO public.expense_heads (name, description, is_active)
VALUES 
  ('Utilities', 'Electricity, Water, Gas bills', true),
  ('Stationery', 'Office and classroom supplies', true),
  ('Maintenance', 'Building and equipment repairs', true),
  ('Salaries', 'Staff salaries and wages', true),
  ('Transport', 'Vehicle fuel and maintenance', true),
  ('Events', 'School functions and ceremonies', true),
  ('Miscellaneous', 'Other expenses', true);
