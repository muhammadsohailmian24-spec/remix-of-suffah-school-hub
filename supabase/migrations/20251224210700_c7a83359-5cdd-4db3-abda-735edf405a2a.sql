-- Create fee_structures table for defining fee types
CREATE TABLE public.fee_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  fee_type TEXT NOT NULL DEFAULT 'tuition',
  academic_year_id UUID REFERENCES public.academic_years(id),
  class_id UUID REFERENCES public.classes(id),
  due_date DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurring_period TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_fees table for tracking fees assigned to students
CREATE TABLE public.student_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_structure_id UUID NOT NULL REFERENCES public.fee_structures(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  final_amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fee_payments table for tracking payments
CREATE TABLE public.fee_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_fee_id UUID NOT NULL REFERENCES public.student_fees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  transaction_id TEXT,
  receipt_number TEXT,
  remarks TEXT,
  received_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for fee_structures
CREATE POLICY "fee_structures_admin" ON public.fee_structures
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "fee_structures_select" ON public.fee_structures
  FOR SELECT USING (true);

-- RLS policies for student_fees
CREATE POLICY "student_fees_admin" ON public.student_fees
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "student_fees_select_own" ON public.student_fees
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- RLS policies for fee_payments
CREATE POLICY "fee_payments_admin" ON public.fee_payments
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "fee_payments_select" ON public.fee_payments
  FOR SELECT USING (
    student_fee_id IN (
      SELECT sf.id FROM student_fees sf
      JOIN students s ON sf.student_id = s.id
      WHERE s.user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_fee_structures_updated_at
  BEFORE UPDATE ON public.fee_structures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_fees_updated_at
  BEFORE UPDATE ON public.student_fees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();