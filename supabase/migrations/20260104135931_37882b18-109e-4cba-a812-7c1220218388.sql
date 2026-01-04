-- Add parent information columns to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS father_name text,
ADD COLUMN IF NOT EXISTS father_phone text,
ADD COLUMN IF NOT EXISTS father_cnic text,
ADD COLUMN IF NOT EXISTS father_email text,
ADD COLUMN IF NOT EXISTS mother_name text,
ADD COLUMN IF NOT EXISTS mother_phone text,
ADD COLUMN IF NOT EXISTS guardian_occupation text;