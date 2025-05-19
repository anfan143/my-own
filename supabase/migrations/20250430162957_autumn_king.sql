/*
  # Enhance Profile Security and Data Handling

  1. Changes
    - Add stricter RLS policies for profile management
    - Add validation triggers for provider profile updates
    - Add profile completion tracking
    - Ensure proper data visibility for public vs authenticated users
  
  2. Security
    - Enforce user-specific data access
    - Protect sensitive information
    - Maintain public visibility for necessary provider data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view provider profiles" ON provider_profiles;
DROP POLICY IF EXISTS "Providers can update own profile" ON provider_profiles;
DROP POLICY IF EXISTS "Providers can insert own profile" ON provider_profiles;

-- Create enhanced policies for provider_profiles
CREATE POLICY "Public can view approved provider data"
  ON provider_profiles
  FOR SELECT
  TO public
  USING (
    profile_completion_percentage >= 60 AND
    business_name IS NOT NULL AND
    business_description IS NOT NULL
  );

CREATE POLICY "Providers can manage their own profile"
  ON provider_profiles
  FOR ALL
  TO authenticated
  USING (
    id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type = 'provider'
    )
  )
  WITH CHECK (
    id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type = 'provider'
    )
  );

-- Create function to calculate profile completion
CREATE OR REPLACE FUNCTION calculate_provider_completion()
RETURNS trigger AS $$
DECLARE
  completion INTEGER := 0;
  service_count INTEGER;
  area_count INTEGER;
  portfolio_count INTEGER;
BEGIN
  -- Basic profile fields (40%)
  IF NEW.business_name IS NOT NULL THEN completion := completion + 10; END IF;
  IF NEW.business_description IS NOT NULL THEN completion := completion + 10; END IF;
  IF NEW.years_in_business IS NOT NULL THEN completion := completion + 10; END IF;
  IF NEW.website IS NOT NULL THEN completion := completion + 10; END IF;

  -- Services (20%)
  SELECT COUNT(*) INTO service_count
  FROM provider_services
  WHERE provider_id = NEW.id;
  IF service_count > 0 THEN completion := completion + 20; END IF;

  -- Service areas (20%)
  SELECT COUNT(*) INTO area_count
  FROM service_areas
  WHERE provider_id = NEW.id;
  IF area_count > 0 THEN completion := completion + 20; END IF;

  -- Portfolio (20%)
  SELECT COUNT(*) INTO portfolio_count
  FROM provider_portfolio
  WHERE provider_id = NEW.id;
  IF portfolio_count > 0 THEN completion := completion + 20; END IF;

  NEW.profile_completion_percentage := completion;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile completion calculation
DROP TRIGGER IF EXISTS update_provider_completion ON provider_profiles;
CREATE TRIGGER update_provider_completion
  BEFORE INSERT OR UPDATE ON provider_profiles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_provider_completion();

-- Add validation trigger for provider updates
CREATE OR REPLACE FUNCTION validate_provider_update()
RETURNS trigger AS $$
BEGIN
  -- Ensure provider can only update their own profile
  IF NEW.id != auth.uid() THEN
    RAISE EXCEPTION 'You can only update your own profile';
  END IF;

  -- Ensure user is a provider
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND user_type = 'provider'
  ) THEN
    RAISE EXCEPTION 'Only providers can update provider profiles';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for provider update validation
DROP TRIGGER IF EXISTS validate_provider_update ON provider_profiles;
CREATE TRIGGER validate_provider_update
  BEFORE UPDATE ON provider_profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_provider_update();

-- Update service_areas policies
DROP POLICY IF EXISTS "Public can view service areas" ON service_areas;
CREATE POLICY "Public can view service areas for completed profiles"
  ON service_areas
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM provider_profiles
      WHERE id = provider_id
      AND profile_completion_percentage >= 60
    )
  );

-- Update provider_portfolio policies
DROP POLICY IF EXISTS "Public can view portfolio items" ON provider_portfolio;
CREATE POLICY "Public can view portfolio for completed profiles"
  ON provider_portfolio
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM provider_profiles
      WHERE id = provider_id
      AND profile_completion_percentage >= 60
    )
  );

-- Update provider_services policies
DROP POLICY IF EXISTS "Public can view provider services" ON provider_services;
CREATE POLICY "Public can view services for completed profiles"
  ON provider_services
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM provider_profiles
      WHERE id = provider_id
      AND profile_completion_percentage >= 60
    )
  );