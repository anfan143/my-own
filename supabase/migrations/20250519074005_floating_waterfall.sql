/*
  # Update Provider Completion Status View

  1. Changes
    - Create materialized view for tracking provider profile completion
    - Add security policies for view access
    - Update provider profile access control policy

  2. Security
    - Grant appropriate permissions for materialized view
    - Update provider profile policy to use completion status
*/

-- Create the materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS provider_completion_status AS
SELECT 
  pp.id,
  CASE 
    WHEN pp.business_name IS NOT NULL 
    AND pp.business_description IS NOT NULL 
    AND pp.years_in_business IS NOT NULL 
    AND pp.website IS NOT NULL 
    THEN true 
    ELSE false 
  END as is_complete,
  CASE 
    WHEN pp.business_name IS NOT NULL 
    AND pp.business_description IS NOT NULL 
    THEN true 
    ELSE false 
  END as has_required_fields
FROM provider_profiles pp
WITH NO DATA;

-- Set up RLS for the materialized view
ALTER MATERIALIZED VIEW provider_completion_status ENABLE ROW LEVEL SECURITY;

-- Create policy for the materialized view
CREATE POLICY "Public can view completion status"
  ON provider_completion_status
  FOR SELECT
  TO PUBLIC
  USING (true);

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW provider_completion_status;

-- Update provider_profiles policy
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'provider_profiles' 
    AND policyname = 'Provider profile access control'
  ) THEN
    DROP POLICY "Provider profile access control" ON provider_profiles;
  END IF;
END $$;

CREATE POLICY "Provider profile access control" ON provider_profiles
  FOR ALL
  TO public
  USING (
    (
      -- Allow access if profile is complete enough
      (profile_completion_percentage >= 60 AND business_name IS NOT NULL AND business_description IS NOT NULL)
      OR 
      -- Or if it's the owner's own profile
      (id = auth.uid() AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.user_type = 'provider' OR profiles.role_type = 'both')
      ))
    )
  )
  WITH CHECK (
    -- Only allow updates by the owner
    id = auth.uid() AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.user_type = 'provider' OR profiles.role_type = 'both')
    )
  );