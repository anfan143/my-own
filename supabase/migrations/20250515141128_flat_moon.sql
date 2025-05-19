-- Add role_type to profiles if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role_type text NOT NULL DEFAULT 'single'
CHECK (role_type IN ('single', 'both'));

-- Create role switch history table
CREATE TABLE IF NOT EXISTS role_switch_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
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

-- Drop existing policy if it exists
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
BEGIN
  -- Check if switching to provider role
  IF NEW.user_type = 'provider' AND OLD.user_type = 'customer' THEN
    -- Validate required fields
    IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
      RAISE EXCEPTION 'Name is required for providers';
    END IF;
    
    IF NEW.email IS NULL OR trim(NEW.email) = '' THEN
      RAISE EXCEPTION 'Email is required for providers';
    END IF;
    
    IF NEW.phone IS NULL OR trim(NEW.phone) = '' THEN
      RAISE EXCEPTION 'Phone is required for providers';
    END IF;
    
    IF NEW.location IS NULL OR trim(NEW.location) = '' THEN
      RAISE EXCEPTION 'Location is required for providers';
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
  INSERT INTO provider_profiles (
    id,
    available,
    profile_completion_percentage
  ) VALUES (
    NEW.id,
    true,
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to sync shared profile data
CREATE OR REPLACE FUNCTION sync_shared_profile_data()
RETURNS trigger AS $$
BEGIN
  -- Update shared fields
  UPDATE profiles
  SET
    name = NEW.name,
    email = NEW.email,
    phone = NEW.phone,
    location = NEW.location,
    updated_at = now()
  WHERE id = NEW.id;
  
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

-- Create error logging table
CREATE TABLE IF NOT EXISTS permission_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  error_type text NOT NULL,
  error_message text NOT NULL,
  attempted_action text NOT NULL,
  context jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on error logs
ALTER TABLE permission_error_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "System can insert error logs" ON permission_error_logs;
DROP POLICY IF EXISTS "Users can view their own error logs" ON permission_error_logs;

-- Add policies for error logs
CREATE POLICY "System can insert error logs"
  ON permission_error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own error logs"
  ON permission_error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());