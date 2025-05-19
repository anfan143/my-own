/*
  # Enhance Data Management for Dual-Role Users

  1. Changes
    - Add shared data synchronization trigger
    - Add role-specific data access controls
    - Add data integrity constraints
    - Add role-specific field validation
  
  2. Security
    - Maintain data isolation between roles
    - Ensure proper access control
    - Prevent unauthorized data access
*/

-- Create function to synchronize shared profile data
CREATE OR REPLACE FUNCTION sync_shared_profile_data()
RETURNS trigger AS $$
BEGIN
  -- Only sync if role_type is 'both'
  IF NEW.role_type = 'both' THEN
    -- Update shared fields across all profiles
    UPDATE profiles
    SET
      full_name = COALESCE(NEW.full_name, full_name),
      email = COALESCE(NEW.email, email),
      phone = COALESCE(NEW.phone, phone),
      location = COALESCE(NEW.location, location),
      updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for shared data synchronization
DROP TRIGGER IF EXISTS sync_shared_data ON profiles;
CREATE TRIGGER sync_shared_data
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.role_type = 'both' OR NEW.role_type = 'both')
  EXECUTE FUNCTION sync_shared_profile_data();

-- Update validate_role_switch function to handle data integrity
CREATE OR REPLACE FUNCTION validate_role_switch()
RETURNS trigger AS $$
BEGIN
  -- Validate required fields before role switch
  IF NEW.user_type != OLD.user_type THEN
    IF NEW.full_name IS NULL OR 
       NEW.email IS NULL OR 
       NEW.phone IS NULL OR 
       NEW.location IS NULL THEN
      RAISE EXCEPTION 'Profile must be complete before switching roles';
    END IF;
  END IF;

  -- Only allow switching if role_type is 'both'
  IF OLD.user_type != NEW.user_type AND OLD.role_type = 'single' THEN
    RAISE EXCEPTION 'Cannot switch roles with single role type';
  END IF;

  -- Ensure valid role combinations
  IF NEW.role_type = 'both' AND NEW.user_type NOT IN ('customer', 'provider') THEN
    RAISE EXCEPTION 'Invalid user type for dual role account';
  END IF;

  -- Ensure provider profile exists when switching to provider
  IF NEW.user_type = 'provider' AND NOT EXISTS (
    SELECT 1 FROM provider_profiles WHERE id = NEW.id
  ) THEN
    INSERT INTO provider_profiles (
      id,
      available,
      profile_completion_percentage
    ) VALUES (
      NEW.id,
      true,
      0
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies for dual-role access
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    (role_type = 'both' AND id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Add function to validate provider-specific data
CREATE OR REPLACE FUNCTION validate_provider_data()
RETURNS trigger AS $$
BEGIN
  -- Only validate if user is a provider or switching to provider
  IF NEW.user_type = 'provider' THEN
    -- Check provider-specific fields in provider_profiles
    IF NOT EXISTS (
      SELECT 1 FROM provider_profiles
      WHERE id = NEW.id
      AND business_name IS NOT NULL
      AND business_description IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Provider profile data is incomplete';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for provider data validation
DROP TRIGGER IF EXISTS validate_provider_data ON profiles;
CREATE TRIGGER validate_provider_data
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.user_type = 'provider')
  EXECUTE FUNCTION validate_provider_data();

-- Add index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role_type_user_type 
ON profiles(role_type, user_type);