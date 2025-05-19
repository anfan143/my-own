/*
  # Optimize Database Schema
  
  1. Changes
    - Remove unused columns
    - Optimize data types
    - Add missing constraints
    - Remove redundant fields
*/

-- Remove unused columns from provider_profiles
ALTER TABLE provider_profiles
DROP COLUMN IF EXISTS skills,
DROP COLUMN IF EXISTS experience_level,
DROP COLUMN IF EXISTS provider_description,
DROP COLUMN IF EXISTS hourly_rate,
DROP COLUMN IF EXISTS average_rating,
DROP COLUMN IF EXISTS total_reviews;

-- Remove unused columns from profiles
ALTER TABLE profiles 
DROP COLUMN IF EXISTS full_name; -- replaced by name

-- Remove unused columns from project_proposals
ALTER TABLE project_proposals
DROP COLUMN IF EXISTS status; -- status is tracked in project_providers

-- Add NOT NULL constraints where appropriate
ALTER TABLE provider_profiles
ALTER COLUMN profile_completion_percentage SET NOT NULL,
ALTER COLUMN available SET NOT NULL;

-- Add default values
ALTER TABLE provider_profiles
ALTER COLUMN profile_completion_percentage SET DEFAULT 0,
ALTER COLUMN available SET DEFAULT true;

-- Add check constraints
ALTER TABLE provider_profiles
ADD CONSTRAINT valid_completion_percentage 
CHECK (profile_completion_percentage >= 0 AND profile_completion_percentage <= 100);

-- Update indexes
DROP INDEX IF EXISTS idx_profiles_role_user_type;
DROP INDEX IF EXISTS idx_profiles_user_type;
CREATE INDEX idx_profiles_role_user_type ON profiles(role_type, user_type);

-- Update materialized view
DROP MATERIALIZED VIEW IF EXISTS provider_completion_status;
CREATE MATERIALIZED VIEW provider_completion_status AS
SELECT
  id,
  profile_completion_percentage >= 60 AS is_complete,
  business_name IS NOT NULL AND business_description IS NOT NULL AS has_required_fields
FROM provider_profiles;

CREATE UNIQUE INDEX provider_completion_status_id ON provider_completion_status(id);

-- Refresh materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY provider_completion_status;