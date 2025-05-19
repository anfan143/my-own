/*
  # Enhance Provider Profile Schema

  1. Changes
    - Add missing fields to provider_profiles
    - Add business-related fields
    - Add profile completion tracking
  
  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity
*/

-- Add new fields to provider_profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'provider_profiles' AND column_name = 'business_name'
  ) THEN
    ALTER TABLE provider_profiles ADD COLUMN business_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'provider_profiles' AND column_name = 'business_description'
  ) THEN
    ALTER TABLE provider_profiles ADD COLUMN business_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'provider_profiles' AND column_name = 'years_in_business'
  ) THEN
    ALTER TABLE provider_profiles ADD COLUMN years_in_business integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'provider_profiles' AND column_name = 'website'
  ) THEN
    ALTER TABLE provider_profiles ADD COLUMN website text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'provider_profiles' AND column_name = 'profile_completion_percentage'
  ) THEN
    ALTER TABLE provider_profiles ADD COLUMN profile_completion_percentage integer DEFAULT 0;
  END IF;
END $$;