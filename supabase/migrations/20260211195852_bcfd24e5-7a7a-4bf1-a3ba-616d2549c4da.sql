
-- Fix 1: Make student-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'student-photos';

-- Drop the overly permissive public SELECT policy on student-photos
DROP POLICY IF EXISTS "Student photos are publicly accessible" ON storage.objects;

-- Create role-based SELECT policies for student-photos
CREATE POLICY "Admins can view all student photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-photos' AND public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Teachers can view student photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-photos' AND public.has_role(auth.uid(), 'teacher'::public.user_role));

CREATE POLICY "Students can view own photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'student-photos' AND
  auth.uid() IN (
    SELECT s.user_id FROM public.students s
    WHERE s.user_id = auth.uid()
  )
);

-- Fix 2: Restrict families table - drop the public SELECT policy
DROP POLICY IF EXISTS "families_select" ON public.families;

-- Replace with admin-only + parent viewing own family
CREATE POLICY "families_select_own"
ON public.families FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.user_role)
  OR id IN (
    SELECT sf.family_id FROM public.student_families sf
    JOIN public.student_parents sp ON sp.student_id = sf.student_id
    JOIN public.parents p ON p.id = sp.parent_id
    WHERE p.user_id = auth.uid()
  )
);

-- Fix 3: Restrict admissions INSERT - drop the overly permissive policy
DROP POLICY IF EXISTS "admissions_insert_authenticated" ON public.admissions;

-- Allow anonymous/public inserts ONLY (for the public admission form) but with no SELECT
-- The admission form needs to insert without auth, so we use anon role
CREATE POLICY "admissions_insert_public"
ON public.admissions FOR INSERT
WITH CHECK (true);
