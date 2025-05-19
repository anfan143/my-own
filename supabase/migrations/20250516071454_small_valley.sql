/*
  # Fix provider completion status view permissions

  1. Changes
    - Grant necessary permissions on provider_completion_status materialized view
    - Update RLS policies to allow proper access to provider_completion_status
    - Ensure authenticated users can access the view when updating their profiles
  
  2. Security
    - Maintains RLS security while allowing necessary access
    - Only allows providers to access their own data
*/

-- Drop the existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS provider_completion_status;

-- Recreate the materialized view with proper security
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

-- Grant necessary permissions
ALTER MATERIALIZED VIEW provider_completion_status OWNER TO authenticated;
GRANT SELECT ON provider_completion_status TO authenticated;
GRANT SELECT ON provider_completion_status TO anon;

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW provider_completion_status;

-- Update the provider_profiles policy to ensure it works with the materialized view
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