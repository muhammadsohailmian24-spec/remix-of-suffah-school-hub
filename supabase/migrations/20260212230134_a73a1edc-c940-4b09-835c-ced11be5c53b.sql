
-- Create student_custom_fees table
CREATE TABLE public.student_custom_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_type_name TEXT NOT NULL,
  custom_monthly_amount NUMERIC NOT NULL DEFAULT 0,
  academic_year_id UUID REFERENCES public.academic_years(id),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint per student/fee_type/year
CREATE UNIQUE INDEX idx_student_custom_fees_unique 
ON public.student_custom_fees(student_id, fee_type_name, academic_year_id);

-- Enable RLS
ALTER TABLE public.student_custom_fees ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "student_custom_fees_admin"
ON public.student_custom_fees
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Timestamp trigger
CREATE TRIGGER update_student_custom_fees_updated_at
BEFORE UPDATE ON public.student_custom_fees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
