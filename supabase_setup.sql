-- ==============================================================================
-- SIT College Portal - Supabase Setup Script
-- Run this in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. Confirm Auth Emails for Demo Student and Faculty Users
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email IN ('karthick.rajan@sit.edu', 'priya.dharshini@sit.edu');

-- 2. Link User Accounts to user_profiles Table
INSERT INTO public.user_profiles (user_id, role, student_id)
SELECT id, 'student', 'STU2024001'
FROM auth.users
WHERE email = 'karthick.rajan@sit.edu'
ON CONFLICT (user_id) DO UPDATE
SET role = 'student', student_id = 'STU2024001';

INSERT INTO public.user_profiles (user_id, role, student_id)
SELECT id, 'faculty', NULL
FROM auth.users
WHERE email = 'priya.dharshini@sit.edu'
ON CONFLICT (user_id) DO UPDATE
SET role = 'faculty', student_id = NULL;

-- 3. Row Level Security (RLS) Configuration

-- ── user_profiles ──
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ── students ──
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Faculty can view all students" ON public.students;
CREATE POLICY "Faculty can view all students"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'faculty'
    )
  );

DROP POLICY IF EXISTS "Students can view own student record" ON public.students;
CREATE POLICY "Students can view own student record"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    student_id = (
      SELECT student_id FROM public.user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- ── attendance ──
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Faculty can read all attendance" ON public.attendance;
CREATE POLICY "Faculty can read all attendance"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'faculty'
    )
  );

DROP POLICY IF EXISTS "Faculty can update attendance" ON public.attendance;
CREATE POLICY "Faculty can update attendance"
  ON public.attendance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'faculty'
    )
  );

DROP POLICY IF EXISTS "Students can read own attendance" ON public.attendance;
CREATE POLICY "Students can read own attendance"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (
    student_id = (
      SELECT student_id FROM public.user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- ── student_marks ──
ALTER TABLE public.student_marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Faculty can read all student_marks" ON public.student_marks;
CREATE POLICY "Faculty can read all student_marks"
  ON public.student_marks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'faculty'
    )
  );

DROP POLICY IF EXISTS "Faculty can update student_marks" ON public.student_marks;
CREATE POLICY "Faculty can update student_marks"
  ON public.student_marks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'faculty'
    )
  );

DROP POLICY IF EXISTS "Students can read own marks" ON public.student_marks;
CREATE POLICY "Students can read own marks"
  ON public.student_marks FOR SELECT
  TO authenticated
  USING (
    student_id = (
      SELECT student_id FROM public.user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- ── max_marks_config ──
ALTER TABLE public.max_marks_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read max_marks_config" ON public.max_marks_config;
CREATE POLICY "Authenticated users can read max_marks_config"
  ON public.max_marks_config FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Faculty can modify max_marks_config" ON public.max_marks_config;
CREATE POLICY "Faculty can modify max_marks_config"
  ON public.max_marks_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'faculty'
    )
  );
