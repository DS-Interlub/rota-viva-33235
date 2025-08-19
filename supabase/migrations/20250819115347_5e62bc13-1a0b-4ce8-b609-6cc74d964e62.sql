-- Update the handle_new_user function to handle admin creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'driver')
  );
  RETURN NEW;
END;
$$;

-- Add a function to create driver users from admin
CREATE OR REPLACE FUNCTION public.create_driver_user(
  driver_email text,
  driver_password text,
  driver_name text,
  existing_driver_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  driver_record_id uuid;
  result json;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN json_build_object('error', 'Unauthorized: Admin access required');
  END IF;

  -- Create or get driver record
  IF existing_driver_id IS NOT NULL THEN
    driver_record_id := existing_driver_id;
  ELSE
    INSERT INTO drivers (name, email) 
    VALUES (driver_name, driver_email)
    RETURNING id INTO driver_record_id;
  END IF;

  -- Return success with driver info
  RETURN json_build_object(
    'success', true, 
    'driver_id', driver_record_id,
    'message', 'Driver user creation initiated. User will receive email to set password.'
  );
END;
$$;