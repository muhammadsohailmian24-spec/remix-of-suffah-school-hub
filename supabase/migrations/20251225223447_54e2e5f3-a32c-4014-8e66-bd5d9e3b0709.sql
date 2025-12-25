-- Allow parents to select students they are linked to
CREATE POLICY "parents_select_linked_students" 
ON public.students 
FOR SELECT 
USING (
  id IN (
    SELECT sp.student_id 
    FROM student_parents sp 
    JOIN parents p ON sp.parent_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

-- Allow parents to select profiles of their linked students
CREATE POLICY "parents_select_children_profiles" 
ON public.profiles 
FOR SELECT 
USING (
  user_id IN (
    SELECT s.user_id 
    FROM students s
    JOIN student_parents sp ON sp.student_id = s.id
    JOIN parents p ON sp.parent_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Allow parents to view attendance of their linked students
CREATE POLICY "parents_select_children_attendance" 
ON public.attendance 
FOR SELECT 
USING (
  student_id IN (
    SELECT sp.student_id 
    FROM student_parents sp 
    JOIN parents p ON sp.parent_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

-- Allow parents to view results of their linked students
CREATE POLICY "parents_select_children_results" 
ON public.results 
FOR SELECT 
USING (
  student_id IN (
    SELECT sp.student_id 
    FROM student_parents sp 
    JOIN parents p ON sp.parent_id = p.id 
    WHERE p.user_id = auth.uid()
  )
  AND is_published = true
);

-- Allow parents to view fees of their linked students
CREATE POLICY "parents_select_children_fees" 
ON public.student_fees 
FOR SELECT 
USING (
  student_id IN (
    SELECT sp.student_id 
    FROM student_parents sp 
    JOIN parents p ON sp.parent_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

-- Allow parents to view fee payments of their linked students
CREATE POLICY "parents_select_children_payments" 
ON public.fee_payments 
FOR SELECT 
USING (
  student_fee_id IN (
    SELECT sf.id 
    FROM student_fees sf
    JOIN student_parents sp ON sp.student_id = sf.student_id
    JOIN parents p ON sp.parent_id = p.id
    WHERE p.user_id = auth.uid()
  )
);