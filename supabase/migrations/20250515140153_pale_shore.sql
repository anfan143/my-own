/*
  # Fix Database Naming Inconsistencies

  1. Changes
    - Rename columns to be more consistent and descriptive
    - Update related functions and triggers
    - Ensure consistent naming patterns across tables
  
  2. Security
    - Maintain existing RLS policies
    - Update any references in functions and triggers
*/

-- Rename columns for consistency
ALTER TABLE provider_profiles RENAME COLUMN description TO provider_description;
ALTER TABLE provider_portfolio RENAME COLUMN description TO portfolio_description;
ALTER TABLE project_milestones RENAME COLUMN description TO milestone_description;
ALTER TABLE provider_services RENAME COLUMN category TO service_category;

-- Update provider_profiles completion calculation
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

-- Update provider services policy
DROP POLICY IF EXISTS "Providers can manage their services" ON provider_services;
CREATE POLICY "Providers can manage their services"
  ON provider_services
  FOR ALL
  TO authenticated
  USING (
    provider_id = auth.uid() AND
    check_role_permission(auth.uid(), 'provider', 'access')
  )
  WITH CHECK (
    provider_id = auth.uid() AND
    check_role_permission(auth.uid(), 'provider', 'access')
  );

-- Update check for service category in provider_services
ALTER TABLE provider_services DROP CONSTRAINT IF EXISTS provider_services_category_check;
ALTER TABLE provider_services ADD CONSTRAINT provider_services_service_category_check
  CHECK (service_category IN (
    'General Renovation',
    'Kitchen Remodeling',
    'Bathroom Remodeling',
    'Room Addition',
    'Outdoor Space',
    'Roofing',
    'Electrical Work',
    'Plumbing',
    'Flooring',
    'Painting',
    'Windows and Doors',
    'HVAC',
    'Other'
  ));