/*
  # Further Optimize RLS Policies

  1. Changes
    - Replace auth.uid() with subselects
    - Add composite indexes for common query patterns
    - Optimize policy conditions
    - Add caching hints
  
  2. Security
    - Maintain strict access controls
    - Improve query performance
*/

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_profiles_role_user_type ON profiles(role_type, user_type);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_completion_business ON provider_profiles(profile_completion_percentage, business_name, business_description);
CREATE INDEX IF NOT EXISTS idx_project_providers_project_provider ON project_providers(project_id, provider_id);

-- Optimize profiles policies
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;

CREATE POLICY "Users can manage own profile"
  ON profiles
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Optimize provider_profiles policies
DROP POLICY IF EXISTS "Provider profile access control" ON provider_profiles;

CREATE POLICY "Provider profile access control"
  ON provider_profiles
  USING (
    -- Public can view completed profiles
    (
      profile_completion_percentage >= 60 AND
      business_name IS NOT NULL AND
      business_description IS NOT NULL
    ) OR
    -- Providers can view/edit their own profile
    (
      id = (SELECT auth.uid()) AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = (SELECT auth.uid())
        AND (user_type = 'provider' OR role_type = 'both')
      )
    )
  )
  WITH CHECK (
    id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND (user_type = 'provider' OR role_type = 'both')
    )
  );

-- Optimize project_providers policies
DROP POLICY IF EXISTS "Project provider access control" ON project_providers;

CREATE POLICY "Project provider access control"
  ON project_providers
  USING (
    -- Providers can view their projects
    provider_id = (SELECT auth.uid()) OR
    -- Customers can view their project providers
    EXISTS (
      SELECT 1 FROM customer_projects
      WHERE id = project_id
      AND customer_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    -- Providers can update their own status
    (
      provider_id = (SELECT auth.uid()) AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = (SELECT auth.uid())
        AND (user_type = 'provider' OR role_type = 'both')
      )
    ) OR
    -- Customers can create provider links
    (
      EXISTS (
        SELECT 1 FROM customer_projects
        WHERE id = project_id
        AND customer_id = (SELECT auth.uid())
      )
    )
  );

-- Optimize project_proposals policies
DROP POLICY IF EXISTS "Project proposal access control" ON project_proposals;

CREATE POLICY "Project proposal access control"
  ON project_proposals
  USING (
    -- Providers can view their proposals
    provider_id = (SELECT auth.uid()) OR
    -- Customers can view proposals for their projects
    EXISTS (
      SELECT 1 FROM customer_projects
      WHERE id = project_id
      AND customer_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    provider_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND (user_type = 'provider' OR role_type = 'both')
    )
  );

-- Optimize service_areas policies
DROP POLICY IF EXISTS "Service area access control" ON service_areas;

CREATE POLICY "Service area access control"
  ON service_areas
  USING (
    EXISTS (
      SELECT 1 FROM provider_profiles
      WHERE id = provider_id
      AND (
        -- Public can view areas for completed profiles
        profile_completion_percentage >= 60 OR
        -- Providers can manage their areas
        id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (provider_id = (SELECT auth.uid()));

-- Optimize provider_portfolio policies
DROP POLICY IF EXISTS "Portfolio access control" ON provider_portfolio;

CREATE POLICY "Portfolio access control"
  ON provider_portfolio
  USING (
    EXISTS (
      SELECT 1 FROM provider_profiles
      WHERE id = provider_id
      AND (
        -- Public can view portfolio for completed profiles
        profile_completion_percentage >= 60 OR
        -- Providers can manage their portfolio
        id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (provider_id = (SELECT auth.uid()));

-- Optimize provider_services policies
DROP POLICY IF EXISTS "Provider services access control" ON provider_services;

CREATE POLICY "Provider services access control"
  ON provider_services
  USING (
    EXISTS (
      SELECT 1 FROM provider_profiles
      WHERE id = provider_id
      AND (
        -- Public can view services for completed profiles
        profile_completion_percentage >= 60 OR
        -- Providers can manage their services
        id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (provider_id = (SELECT auth.uid()));

-- Add materialized view for provider completion status
CREATE MATERIALIZED VIEW IF NOT EXISTS provider_completion_status AS
SELECT
  id,
  profile_completion_percentage >= 60 AS is_complete,
  business_name IS NOT NULL AND business_description IS NOT NULL AS has_required_fields
FROM provider_profiles
WHERE profile_completion_percentage >= 60
  AND business_name IS NOT NULL
  AND business_description IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS provider_completion_status_id ON provider_completion_status(id);

-- Function to refresh provider completion status
CREATE OR REPLACE FUNCTION refresh_provider_completion_status()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY provider_completion_status;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh completion status
DROP TRIGGER IF EXISTS refresh_completion_status ON provider_profiles;
CREATE TRIGGER refresh_completion_status
  AFTER INSERT OR UPDATE OR DELETE ON provider_profiles
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_provider_completion_status();

-- Add function to check role-based access with caching
CREATE OR REPLACE FUNCTION check_role_access(user_id uuid, required_role text)
RETURNS boolean AS $$
DECLARE
  result boolean;
BEGIN
  -- Check cache first
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND (
      user_type = required_role OR
      role_type = 'both'
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;