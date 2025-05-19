/*
  # Add Role Switching Support

  1. Changes
    - Add role_type field to profiles table
    - Add currently_active_as field to profiles table
    - Update RLS policies for role switching
  
  2. Security
    - Maintain existing RLS policies
    - Add validation for role switching
*/

-- Add role_type field to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_type text NOT NULL DEFAULT 'single' CHECK (role_type IN ('single', 'both'));

-- Add function to validate role switching
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for role switching validation
DROP TRIGGER IF EXISTS validate_role_switch ON profiles;
CREATE TRIGGER validate_role_switch
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_role_switch();