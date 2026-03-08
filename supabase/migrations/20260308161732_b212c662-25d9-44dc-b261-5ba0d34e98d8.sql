
CREATE OR REPLACE FUNCTION public.get_user_contacts(_user_id uuid)
RETURNS TABLE(user_id uuid, full_name text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Get teachers of classes the user is a member of
  SELECT DISTINCT p.user_id, p.full_name, 'teacher' as role
  FROM class_members cm
  JOIN classes c ON c.id = cm.class_id
  JOIN profiles p ON p.user_id = c.teacher_id
  WHERE cm.student_id = _user_id
  
  UNION
  
  -- Get classmates from shared classes
  SELECT DISTINCT p.user_id, p.full_name, 'student' as role
  FROM class_members cm
  JOIN class_members cm2 ON cm2.class_id = cm.class_id AND cm2.student_id != _user_id
  JOIN profiles p ON p.user_id = cm2.student_id
  WHERE cm.student_id = _user_id
  
  UNION
  
  -- For teachers: get all their students
  SELECT DISTINCT p.user_id, p.full_name, 'student' as role
  FROM classes c
  JOIN class_members cm ON cm.class_id = c.id
  JOIN profiles p ON p.user_id = cm.student_id
  WHERE c.teacher_id = _user_id
  
  UNION
  
  -- For teachers: get other teachers (via shared students)
  SELECT DISTINCT p.user_id, p.full_name, 'teacher' as role
  FROM classes c
  JOIN profiles p ON p.user_id = c.teacher_id
  WHERE c.teacher_id != _user_id
  AND EXISTS (
    SELECT 1 FROM classes c2 WHERE c2.teacher_id = _user_id
  )
  
  UNION
  
  -- Anyone who has already messaged the user
  SELECT DISTINCT p.user_id, p.full_name, 
    COALESCE((SELECT ur.role::text FROM user_roles ur WHERE ur.user_id = p.user_id LIMIT 1), 'user') as role
  FROM messages m
  JOIN profiles p ON p.user_id = CASE 
    WHEN m.sender_id = _user_id THEN m.receiver_id
    ELSE m.sender_id
  END
  WHERE m.sender_id = _user_id OR m.receiver_id = _user_id
$$;
