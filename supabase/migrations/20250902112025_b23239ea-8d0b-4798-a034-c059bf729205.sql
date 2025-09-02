-- Update the status check constraint to allow 'draft' status
-- This enables the desired workflow: create route with draft status -> optimize -> assign driver/vehicle

ALTER TABLE public.routes 
DROP CONSTRAINT IF EXISTS routes_status_check;

ALTER TABLE public.routes 
ADD CONSTRAINT routes_status_check 
CHECK (status IN ('draft', 'pending', 'in_progress', 'completed'));