/*
  # Enhance Dual-Role User Schema

  1. Changes
    - Add role_type validation
    - Add profile relationship tracking
    - Add data integrity constraints
    - Add role switching audit log
  
  2. Security
    - Maintain RLS policies
    - Add role-specific access controls
*/

-- Create role switch history table
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

-- Add policy for role switch history
CREATE POLICY "Users can view their own role switch history"
  ON role_switch_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Add function to track role switches
CREATE OR REPLACE FUNCTION track_role_switch()
RETURNS trigger AS $$
BEGIN
  IF OLD.user_type != NEW.user_type THEN
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

-- Create trigger for role switch tracking
DROP TRIGGER IF EXISTS track_role_switch ON profiles;
CREATE TRIGGER track_role_switch
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION track_role_switch();

-- Update validate_role_switch function to handle data integrity
CREATE OR REPLACE FUNCTION validate_role_switch()
RETURNS trigger AS $$
BEGIN
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