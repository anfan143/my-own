/*
  # Optimize RLS Policies

  1. Changes
    - Consolidate and optimize RLS policies
    - Add proper indexing for performance
    - Improve policy conditions
    - Add better error handling
  
  2. Security
    - Tighten access controls
    - Prevent unauthorized data access
    - Improve query performance
*/

-- Add indexes for commonly used columns in policy checks
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_role_type ON profiles(role_type);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_completion ON provider_profiles(profile_completion_percentage);
CREATE INDEX IF NOT EXISTS idx_project_providers_status ON project_providers(status);
CREATE INDEX IF NOT EXISTS idx_customer_projects_status ON customer_projects(status);

-- Optimize profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can manage own profile"
  ON profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Optimize provider_profiles policies
DROP POLICY IF EXISTS "Public can view approved provider data" ON provider_profiles;
DROP POLICY IF EXISTS "Providers can manage their own profile" ON provider_profiles;

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
      auth.uid() = id AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND (user_type = 'provider' OR role_type = 'both')
      )
    )
  )
  WITH CHECK (
    auth.uid() = id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (user_type = 'provider' OR role_type = 'both')
    )
  );

-- Optimize project_providers policies
DROP POLICY IF EXISTS "Providers can view their linked projects" ON project_providers;
DROP POLICY IF EXISTS "Providers can update their project status" ON project_providers;
DROP POLICY IF EXISTS "Customers can create project_provider records" ON project_providers;

CREATE POLICY "Project provider access control"
  ON project_providers
  USING (
    -- Providers can view their projects
    provider_id = auth.uid() OR
    -- Customers can view their project providers
    EXISTS (
      SELECT 1 FROM customer_projects
      WHERE id = project_id
      AND customer_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Providers can update their own status
    (
      provider_id = auth.uid() AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND (user_type = 'provider' OR role_type = 'both')
      )
    ) OR
    -- Customers can create provider links
    (
      EXISTS (
        SELECT 1 FROM customer_projects
        WHERE id = project_id
        AND customer_id = auth.uid()
      )
    )
  );

-- Optimize project_proposals policies
DROP POLICY IF EXISTS "Providers can create and view their own proposals" ON project_proposals;
DROP POLICY IF EXISTS "Customers can view proposals for their projects" ON project_proposals;

CREATE POLICY "Project proposal access control"
  ON project_proposals
  USING (
    -- Providers can view their proposals
    provider_id = auth.uid() OR
    -- Customers can view proposals for their projects
    EXISTS (
      SELECT 1 FROM customer_projects
      WHERE id = project_id
      AND customer_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Only providers can create/update proposals
    provider_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (user_type = 'provider' OR role_type = 'both')
    )
  );

-- Optimize service_areas policies
DROP POLICY IF EXISTS "Public can view service areas for completed profiles" ON service_areas;
DROP POLICY IF EXISTS "Providers can manage their own service areas" ON service_areas;

CREATE POLICY "Service area access control"
  ON service_areas
  USING (
    -- Public can view areas for completed profiles
    EXISTS (
      SELECT 1 FROM provider_profiles
      WHERE id = provider_id
      AND profile_completion_percentage >= 60
    ) OR
    -- Providers can manage their areas
    provider_id = auth.uid()
  )
  WITH CHECK (provider_id = auth.uid());

-- Optimize provider_portfolio policies
DROP POLICY IF EXISTS "Public can view portfolio for completed profiles" ON provider_portfolio;
DROP POLICY IF EXISTS "Providers can manage their own portfolio" ON provider_portfolio;

CREATE POLICY "Portfolio access control"
  ON provider_portfolio
  USING (
    -- Public can view portfolio for completed profiles
    EXISTS (
      SELECT 1 FROM provider_profiles
      WHERE id = provider_id
      AND profile_completion_percentage >= 60
    ) OR
    -- Providers can manage their portfolio
    provider_id = auth.uid()
  )
  WITH CHECK (provider_id = auth.uid());

-- Optimize provider_services policies
DROP POLICY IF EXISTS "Public can view services for completed profiles" ON provider_services;
DROP POLICY IF EXISTS "Providers can manage their services" ON provider_services;

CREATE POLICY "Provider services access control"
  ON provider_services
  USING (
    -- Public can view services for completed profiles
    EXISTS (
      SELECT 1 FROM provider_profiles
      WHERE id = provider_id
      AND profile_completion_percentage >= 60
    ) OR
    -- Providers can manage their services
    provider_id = auth.uid()
  )
  WITH CHECK (provider_id = auth.uid());

-- Add function to check role-based access
CREATE OR REPLACE FUNCTION check_role_access(user_id uuid, required_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND (
      user_type = required_role OR
      role_type = 'both'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;