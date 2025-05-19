/*
  # Remove hourly_rate from provider_profiles

  1. Changes
    - Remove hourly_rate column from provider_profiles table
    - This information is now managed through provider_services table
  
  2. Security
    - No security changes needed
*/

-- Remove hourly_rate column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'provider_profiles' AND column_name = 'hourly_rate'
  ) THEN
    ALTER TABLE provider_profiles DROP COLUMN hourly_rate;
  END IF;
END $$;