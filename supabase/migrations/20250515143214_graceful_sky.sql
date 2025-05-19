-- First, update any existing NULL values
UPDATE profiles
SET 
  name = COALESCE(name, ''),
  email = COALESCE(email, ''),
  phone = COALESCE(phone, ''),
  location = COALESCE(location, '');

-- Add NOT NULL constraints
ALTER TABLE profiles
ALTER COLUMN name SET NOT NULL,
ALTER COLUMN email SET NOT NULL,
ALTER COLUMN phone SET NOT NULL,
ALTER COLUMN location SET NOT NULL;

-- Create or replace the validation function
CREATE OR REPLACE FUNCTION validate_profile_data()
RETURNS trigger AS $$
BEGIN
  -- Check name
  IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;

  -- Check email
  IF NEW.email IS NULL OR trim(NEW.email) = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  -- Check phone
  IF NEW.phone IS NULL OR trim(NEW.phone) = '' THEN
    RAISE EXCEPTION 'Phone number is required';
  END IF;

  -- Check location
  IF NEW.location IS NULL OR trim(NEW.location) = '' THEN
    RAISE EXCEPTION 'Location is required';
  END IF;

  -- All validations passed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_profile_data ON profiles;

-- Create new trigger
CREATE TRIGGER validate_profile_data
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_profile_data();

-- Update RLS policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Recreate policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());