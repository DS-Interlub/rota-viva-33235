-- Remove the existing unique constraint on license_number
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_license_number_key;

-- Add a unique constraint that allows multiple NULL values but enforces uniqueness for non-NULL values
CREATE UNIQUE INDEX drivers_license_number_unique_idx ON drivers (license_number) WHERE license_number IS NOT NULL;