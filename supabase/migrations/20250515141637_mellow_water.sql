-- Add role_type to profiles if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role_type text NOT NULL DEFAULT 'single'
CHECK (role_type IN ('single', 'both'));

-- Create role switch history table if it doesn't exist
CREATE TABLE IF NOT EXISTS role_switch_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  old_role text NOT NULL,
  new_role text NOT NULL,
  switched_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role_types CHECK (
    old_role IN ('customer', 'provider') AND
    new_role IN ('customer', 'provider')
  )
);

-- Enable RLS on role switch history
ALTER TABLE role_switch_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own role switch history" ON role_switch_history;

-- Add policy for viewing role switch history
CREATE POLICY "Users can view their own role switch history"
  ON role_switch_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to validate role switch
CREATE OR REPLACE FUNCTION validate_role_switch()
RETURNS trigger AS $$
DECLARE
  missing_fields text[];
BEGIN
  -- Check if switching to provider role
  IF NEW.user_type = 'provider' AND OLD.user_type = 'customer' THEN
    -- Build array of missing required fields
    SELECT ARRAY_AGG(field)
    INTO missing_fields
    FROM (
      SELECT field
      FROM unnest(ARRAY['name', 'email', 'phone', 'location']) AS field
      WHERE NOT EXISTS (
        SELECT 1
        FROM jsonb_each_text(to_jsonb(NEW))
        WHERE key = field AND value IS NOT NULL AND value != ''
      )
    ) AS missing;

    -- Raise exception if any required fields are missing
    IF missing_fields IS NOT NULL THEN
      RAISE EXCEPTION 'Missing required fields: %', array_to_string(missing_fields, ', ');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to track role switches
CREATE OR REPLACE FUNCTION track_role_switch()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_type != OLD.user_type THEN
    INSERT INTO role_switch_history (
      user_id,
      old_role,
      new_role
    ) VALUES (
      NEW.id,
      OLD.user_type,
      NEW.user_type
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to prefill provider data
CREATE OR REPLACE FUNCTION prefill_provider_data()
RETURNS trigger AS $$
BEGIN
  -- Only run when switching to provider role
  IF NEW.user_type = 'provider' AND OLD.user_type = 'customer' THEN
    -- Create or update provider profile with prefilled data
    INSERT INTO provider_profiles (
      id,
      business_name,
      business_description,
      years_in_business,
      website,
      available,
      profile_completion_percentage
    ) VALUES (
      NEW.id,
      COALESCE(NEW.name || '''s Business', 'New Business'),
      'Business description pending...',
      0,
      NULL,
      true,
      20  -- Base completion percentage for prefilled data
    )
    ON CONFLICT (id) DO UPDATE SET
      business_name = EXCLUDED.business_name,
      business_description = EXCLUDED.business_description,
      profile_completion_percentage = 20
    WHERE provider_profiles.business_name IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to sync shared profile data
CREATE OR REPLACE FUNCTION sync_shared_profile_data()
RETURNS trigger AS $$
BEGIN
  -- Only sync if role_type is 'both'
  IF NEW.role_type = 'both' THEN
    -- Update shared fields
    UPDATE profiles
    SET
      name = COALESCE(NEW.name, name),
      email = COALESCE(NEW.email, email),
      phone = COALESCE(NEW.phone, phone),
      location = COALESCE(NEW.location, location),
      updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS validate_role_switch ON profiles;
DROP TRIGGER IF EXISTS track_role_switch ON profiles;
DROP TRIGGER IF EXISTS prefill_provider_data ON profiles;
DROP TRIGGER IF EXISTS sync_shared_data ON profiles;

-- Create trigger for role switch validation
CREATE TRIGGER validate_role_switch
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_role_switch();

-- Create trigger for role switch tracking
CREATE TRIGGER track_role_switch
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION track_role_switch();

-- Create trigger for provider data prefill
CREATE TRIGGER prefill_provider_data
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.user_type = 'provider' AND OLD.user_type = 'customer')
  EXECUTE FUNCTION prefill_provider_data();

-- Create trigger for shared data sync
CREATE TRIGGER sync_shared_data
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.role_type = 'both' OR NEW.role_type = 'both')
  EXECUTE FUNCTION sync_shared_profile_data();