-- Create school_sections table for organizing classes by campus/branch
CREATE TABLE public.school_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create houses table for student houses (IQBAL, QADEER, etc.)
CREATE TABLE public.houses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS religion TEXT,
ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Pakistani',
ADD COLUMN IF NOT EXISTS health_notes TEXT,
ADD COLUMN IF NOT EXISTS house_id UUID REFERENCES public.houses(id),
ADD COLUMN IF NOT EXISTS domicile TEXT,
ADD COLUMN IF NOT EXISTS hostel_facility BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transport_facility BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admission_class_id UUID REFERENCES public.classes(id),
ADD COLUMN IF NOT EXISTS roll_number TEXT,
ADD COLUMN IF NOT EXISTS previous_school_admission_no TEXT,
ADD COLUMN IF NOT EXISTS school_leaving_number TEXT,
ADD COLUMN IF NOT EXISTS school_leaving_date DATE,
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS is_from_previous_school BOOLEAN DEFAULT false;

-- Add school_section_id to classes table
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS school_section_id UUID REFERENCES public.school_sections(id);

-- Enable RLS on new tables
ALTER TABLE public.school_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;

-- RLS policies for school_sections
CREATE POLICY "school_sections_select" ON public.school_sections
FOR SELECT USING (true);

CREATE POLICY "school_sections_admin" ON public.school_sections
FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS policies for houses
CREATE POLICY "houses_select" ON public.houses
FOR SELECT USING (true);

CREATE POLICY "houses_admin" ON public.houses
FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

-- Create triggers for updated_at
CREATE TRIGGER update_school_sections_updated_at
BEFORE UPDATE ON public.school_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_houses_updated_at
BEFORE UPDATE ON public.houses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default school sections
INSERT INTO public.school_sections (name, description) VALUES
('Main', 'Main Campus'),
('J&G', 'Junior & Girls Section'),
('Akhundabad', 'Akhundabad Branch')
ON CONFLICT (name) DO NOTHING;

-- Insert default houses
INSERT INTO public.houses (name, description) VALUES
('IQBAL', 'House Iqbal'),
('QADEER', 'House Qadeer')
ON CONFLICT (name) DO NOTHING;