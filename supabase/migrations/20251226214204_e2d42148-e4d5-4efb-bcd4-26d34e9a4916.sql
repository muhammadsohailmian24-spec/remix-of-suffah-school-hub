-- Fix Security Issues

-- 1. Drop the overly permissive profiles_teacher_select policy
DROP POLICY IF EXISTS "profiles_teacher_select" ON public.profiles;

-- 2. Create a more restrictive policy - teachers can only see profiles of students in their classes or their own
CREATE POLICY "profiles_teacher_select_own_and_class_students" 
ON public.profiles 
FOR SELECT 
USING (
  -- Teachers can see their own profile
  auth.uid() = user_id
  OR
  -- Teachers can see profiles of students they teach (via class assignments)
  (
    has_role(auth.uid(), 'teacher'::user_role) 
    AND user_id IN (
      SELECT s.user_id 
      FROM students s
      WHERE s.class_id IN (
        SELECT DISTINCT t.class_id 
        FROM timetable t
        JOIN teachers te ON te.id = t.teacher_id
        WHERE te.user_id = auth.uid()
      )
    )
  )
);

-- 3. Add SELECT policy to admissions table - only admins can read admissions
CREATE POLICY "admissions_select_admin" 
ON public.admissions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));