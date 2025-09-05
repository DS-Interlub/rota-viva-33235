-- Remove the create_first_admin function as it's a security risk
-- Only the first user should be admin, and this should be managed manually
DROP FUNCTION IF EXISTS public.create_first_admin();