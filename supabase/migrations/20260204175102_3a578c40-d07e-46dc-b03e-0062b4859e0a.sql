-- Create careers table for job postings
CREATE TABLE public.careers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT,
  description TEXT NOT NULL,
  requirements TEXT,
  location TEXT DEFAULT 'On-site',
  employment_type TEXT DEFAULT 'Full-time',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.careers ENABLE ROW LEVEL SECURITY;

-- Admin can manage careers
CREATE POLICY "careers_admin" ON public.careers
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

-- Public can view active careers
CREATE POLICY "careers_select_public" ON public.careers
  FOR SELECT USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_careers_updated_at
  BEFORE UPDATE ON public.careers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();