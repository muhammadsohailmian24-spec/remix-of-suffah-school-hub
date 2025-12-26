-- Create gallery table
CREATE TABLE public.gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- Anyone can view visible gallery images
CREATE POLICY "gallery_select_public" 
ON public.gallery 
FOR SELECT 
USING (is_visible = true);

-- Admin can do everything
CREATE POLICY "gallery_admin" 
ON public.gallery 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gallery', 'gallery', true);

-- Storage policies for gallery bucket
CREATE POLICY "Gallery images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'gallery');

CREATE POLICY "Admin can upload gallery images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'gallery' AND has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admin can update gallery images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'gallery' AND has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admin can delete gallery images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'gallery' AND has_role(auth.uid(), 'admin'::user_role));

-- Add trigger for updated_at
CREATE TRIGGER update_gallery_updated_at
BEFORE UPDATE ON public.gallery
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();