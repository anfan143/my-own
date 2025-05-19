/*
  # Fix Provider Completion Status View Permissions

  1. Changes
    - Drop and recreate materialized view with proper security context
    - Set up correct permissions for authenticated and anonymous users
    - Update RLS policy for provider profiles
  
  2. Security
    - Ensure view is owned by postgres role
    - Grant specific permissions to auth roles
    - Update RLS policy to work with materialized view
*/

-- Set the correct security context
SET search_path TO public;

-- Drop the existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS provider_completion_status;

-- Create the materialized view as postgres role
CREATE MATERIALIZED VIEW provider_completion_status AS
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

-- Set up permissions
GRANT SELECT ON provider_completion_status TO postgres;
GRANT SELECT ON provider_completion_status TO service_role;
GRANT SELECT ON provider_completion_status TO authenticated;
GRANT SELECT ON provider_completion_status TO anon;

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW provider_completion_status;

-- Update the provider_profiles policy
DROP POLICY IF EXISTS "Provider profile access control" ON provider_profiles;

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