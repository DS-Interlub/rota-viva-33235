-- Fix the infinite recursion in profiles policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;

-- Create a function to check if user is admin (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Create new policies without recursion
CREATE POLICY "Users can view their own profile" 
ON public.profiles
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.profiles
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" 
ON public.profiles
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can manage all profiles" 
ON public.profiles
FOR ALL
USING (public.is_admin());

-- Create policy for profile creation (only during signup)
CREATE POLICY "Allow profile creation during signup" 
ON public.profiles
FOR INSERT 
WITH CHECK (auth.uid() = user_id);