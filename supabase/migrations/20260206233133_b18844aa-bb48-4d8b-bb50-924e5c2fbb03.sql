-- Fix: Remove public insert policy on admissions table
-- This prevents anonymous users from inserting sensitive PII data
-- Admission form submissions should be handled through a secure edge function

DROP POLICY IF EXISTS "admissions_insert_public" ON public.admissions;

-- Create a more secure policy that only allows authenticated users or service role to insert
-- This still allows the admission form to work but through proper authentication
CREATE POLICY "admissions_insert_authenticated" ON public.admissions
FOR INSERT TO authenticated
WITH CHECK (true);