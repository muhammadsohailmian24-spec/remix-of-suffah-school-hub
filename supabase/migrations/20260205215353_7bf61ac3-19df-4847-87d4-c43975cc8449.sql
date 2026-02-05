-- Fix announcements RLS policy to be permissive for public access
DROP POLICY IF EXISTS "announcements_select" ON public.announcements;

CREATE POLICY "announcements_select_public"
ON public.announcements
FOR SELECT
TO anon, authenticated
USING (is_published = true);

-- Fix gallery RLS policy to be permissive for public access  
DROP POLICY IF EXISTS "gallery_select_public" ON public.gallery;

CREATE POLICY "gallery_select_visible"
ON public.gallery
FOR SELECT
TO anon, authenticated
USING (is_visible = true);