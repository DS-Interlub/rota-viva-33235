-- Allow routes to be created without driver_id and vehicle_id for draft status
-- This enables the desired workflow: create route -> optimize -> assign driver/vehicle

ALTER TABLE public.routes 
ALTER COLUMN driver_id DROP NOT NULL;

ALTER TABLE public.routes 
ALTER COLUMN vehicle_id DROP NOT NULL;