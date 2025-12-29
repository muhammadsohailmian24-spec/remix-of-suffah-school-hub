-- Add photo_url column to profiles table for student photos
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS photo_url text;

-- Create storage bucket for student photos if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public viewing of student photos
CREATE POLICY "Student photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-photos');

-- Allow admins to upload student photos
CREATE POLICY "Admins can upload student photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'student-photos');

-- Allow admins to update student photos
CREATE POLICY "Admins can update student photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'student-photos');

-- Allow admins to delete student photos
CREATE POLICY "Admins can delete student photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'student-photos');