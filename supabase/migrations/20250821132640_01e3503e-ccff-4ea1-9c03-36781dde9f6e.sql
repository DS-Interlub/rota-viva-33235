-- Create a function to create the first admin user
CREATE OR REPLACE FUNCTION public.create_first_admin()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  -- Check if any admin already exists
  SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
  
  IF admin_count > 0 THEN
    RETURN json_build_object('error', 'Admin user already exists');
  END IF;
  
  -- Update the first user to be admin if no admin exists
  UPDATE profiles 
  SET role = 'admin' 
  WHERE user_id = (
    SELECT user_id FROM profiles 
    ORDER BY created_at 
    LIMIT 1
  );
  
  RETURN json_build_object('success', true, 'message', 'First user promoted to admin');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_first_admin() TO authenticated;