-- Create function to get leaderboard data
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_university_name TEXT, p_course_name TEXT, p_limit INTEGER DEFAULT 10, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  registration_number TEXT,
  gpa DECIMAL(3,2)
) AS $$
DECLARE
  profile_record RECORD;
  calculated_gpa DECIMAL(3,2);
BEGIN
  FOR profile_record IN 
    SELECT p.id, p.full_name, p.registration_number, p.user_id
    FROM public.profiles p
    WHERE p.university_name = p_university_name
    AND p.course_name = p_course_name
    ORDER BY p.full_name
    LIMIT p_limit
    OFFSET p_offset
  LOOP
    -- Calculate GPA for this user
    calculated_gpa := public.calculate_gpa(profile_record.user_id);
    
    -- Return the result
    id := profile_record.id;
    full_name := profile_record.full_name;
    registration_number := profile_record.registration_number;
    gpa := calculated_gpa;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to count total leaderboard entries
CREATE OR REPLACE FUNCTION public.count_leaderboard_entries(p_university_name TEXT, p_course_name TEXT)
RETURNS INTEGER AS $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM public.profiles p
  WHERE p.university_name = p_university_name
  AND p.course_name = p_course_name;
  
  RETURN total_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;