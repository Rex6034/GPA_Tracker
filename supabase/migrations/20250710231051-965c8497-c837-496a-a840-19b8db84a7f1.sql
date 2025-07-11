-- Create enum types for better data integrity
CREATE TYPE public.module_type AS ENUM ('compulsory', 'elective', 'optional');
CREATE TYPE public.attempt_type AS ENUM ('first_attempt', 'repeat', 'dropped');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  university_name TEXT NOT NULL,
  course_name TEXT NOT NULL,
  registration_number TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  university_start_year INTEGER NOT NULL,
  university_end_year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create grading criteria table
CREATE TABLE public.grading_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grade_name TEXT NOT NULL,
  gpa_value DECIMAL(3,2) NOT NULL,
  min_percentage DECIMAL(5,2),
  max_percentage DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create semesters table
CREATE TABLE public.semesters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semester_name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create modules table
CREATE TABLE public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL,
  module_name TEXT NOT NULL,
  credit_hours INTEGER NOT NULL,
  grade TEXT NOT NULL,
  module_type module_type NOT NULL DEFAULT 'compulsory',
  attempt_type attempt_type NOT NULL DEFAULT 'first_attempt',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policies for grading criteria
CREATE POLICY "Users can view their own grading criteria" 
ON public.grading_criteria FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own grading criteria" 
ON public.grading_criteria FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grading criteria" 
ON public.grading_criteria FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grading criteria" 
ON public.grading_criteria FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for semesters
CREATE POLICY "Users can view their own semesters" 
ON public.semesters FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own semesters" 
ON public.semesters FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own semesters" 
ON public.semesters FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own semesters" 
ON public.semesters FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for modules
CREATE POLICY "Users can view their own modules" 
ON public.modules FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own modules" 
ON public.modules FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own modules" 
ON public.modules FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own modules" 
ON public.modules FOR DELETE 
USING (auth.uid() = user_id);

-- Create policy for leaderboard (users can view profiles from same university and course)
CREATE POLICY "Users can view leaderboard for same university and course" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.university_name = profiles.university_name 
    AND p.course_name = profiles.course_name
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_semesters_updated_at
  BEFORE UPDATE ON public.semesters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate GPA
CREATE OR REPLACE FUNCTION public.calculate_gpa(p_user_id UUID, p_semester_id UUID DEFAULT NULL)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  total_grade_points DECIMAL := 0;
  total_credit_hours INTEGER := 0;
  module_record RECORD;
  gpa_value DECIMAL(3,2);
BEGIN
  FOR module_record IN 
    SELECT m.credit_hours, m.grade, m.attempt_type
    FROM public.modules m
    JOIN public.semesters s ON m.semester_id = s.id
    WHERE m.user_id = p_user_id 
    AND (p_semester_id IS NULL OR m.semester_id = p_semester_id)
    AND m.attempt_type != 'dropped'
  LOOP
    -- Get GPA value for this grade
    SELECT gc.gpa_value INTO gpa_value
    FROM public.grading_criteria gc
    WHERE gc.user_id = p_user_id AND gc.grade_name = module_record.grade
    LIMIT 1;
    
    IF gpa_value IS NOT NULL THEN
      total_grade_points := total_grade_points + (gpa_value * module_record.credit_hours);
      total_credit_hours := total_credit_hours + module_record.credit_hours;
    END IF;
  END LOOP;
  
  IF total_credit_hours = 0 THEN
    RETURN 0.00;
  END IF;
  
  RETURN ROUND(total_grade_points / total_credit_hours, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;