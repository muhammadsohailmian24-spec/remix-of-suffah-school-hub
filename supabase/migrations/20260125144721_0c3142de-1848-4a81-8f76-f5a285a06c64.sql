-- Create the fee_type_structures table for the fee matrix
CREATE TABLE public.fee_type_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_type_name TEXT NOT NULL,
  grade_level INTEGER NOT NULL,
  annual_amount NUMERIC NOT NULL DEFAULT 0,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fee_type_name, grade_level, academic_year_id)
);

-- Enable Row Level Security
ALTER TABLE public.fee_type_structures ENABLE ROW LEVEL SECURITY;

-- Admin can manage all records
CREATE POLICY "fee_type_structures_admin" ON public.fee_type_structures
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

-- Everyone can read for fee calculations
CREATE POLICY "fee_type_structures_select" ON public.fee_type_structures
  FOR SELECT USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_fee_type_structures_updated_at
  BEFORE UPDATE ON public.fee_type_structures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();